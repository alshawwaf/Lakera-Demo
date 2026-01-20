from flask import Flask, render_template, request, jsonify
import requests
import os
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv
import uuid
import logging
from flask_sqlalchemy import SQLAlchemy
import google.generativeai as genai
import warnings
from flasgger import Swagger
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS

# Suppress Google API warning about Python 3.10 support (EOL 2026)
warnings.filterwarnings("ignore", category=FutureWarning, module="google.api_core")

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure CORS with environment variable
cors_origins = os.getenv('CORS_ORIGINS', '*')
CORS(app, resources={r"/api/*": {"origins": cors_origins}})

# Enable template auto-reload for development
app.config['TEMPLATES_AUTO_RELOAD'] = True

# Configure rate limiting with environment variables
rate_limit_daily = os.getenv('RATE_LIMIT_DAILY', '200')
rate_limit_hourly = os.getenv('RATE_LIMIT_HOURLY', '50')
rate_limit_storage = os.getenv('RATE_LIMIT_STORAGE', 'memory://')

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=[f"{rate_limit_daily} per day", f"{rate_limit_hourly} per hour"],
    storage_uri=rate_limit_storage
)

swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "Lakera Demo API",
        "description": "API documentation for the Lakera Demo application.",
        "version": "1.0.0"
    },
    "basePath": "/",  # base bash for blueprint registration
    "schemes": [
        "http",
        "https"
    ],
}

swagger_config = {
    "headers": [
    ],
    "specs": [
        {
            "endpoint": 'apispec_1',
            "route": '/apispec_1.json',
            "rule_filter": lambda rule: True,  # all in
            "model_filter": lambda tag: True,  # all in
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": False,  # Disable default (Flasgger) UI
    "specs_route": "/apispec_1.json" # Serve spec but not UI
}

swagger = Swagger(app, template=swagger_template, config=swagger_config)

@app.route('/apidocs/')
def apidocs():
    return render_template('swagger.html')

@app.route('/health')
def health_check():
    """
    Health check endpoint.
    ---
    tags:
      - System
    responses:
      200:
        description: Service is healthy
    """
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    }), 200

# Global cache for Models
MODEL_CACHE = {
    'openai': {'data': None, 'timestamp': None},
    'gemini': {'data': None, 'timestamp': None},
    'ollama': {'data': None, 'timestamp': None}
}

# Global cache for Gemini Client
GEMINI_CACHE = {
    'api_key': None,
    'model_name': None,
    'model_instance': None
}
CACHE_DURATION = timedelta(hours=1)


# Configure SQLite database
basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.getenv('DB_PATH', os.path.join(basedir, 'instance', 'lakera_logs.db'))
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///' + db_path)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Define Log model
class Log(db.Model):
    __tablename__ = 'logs'
    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False)
    prompt = db.Column(db.Text, nullable=False)
    attack_vectors = db.Column(db.JSON, nullable=True)
    result_json = db.Column(db.JSON, nullable=True)
    request_json = db.Column(db.JSON, nullable=True)
    error = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            'id': self.uuid,
            'timestamp': self.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            'prompt': self.prompt,
            'attack_vectors': self.attack_vectors or [],
            'result': self.result_json,
            'request': self.request_json,
            'error': self.error,
        }

# Define Settings model
class Settings(db.Model):
    __tablename__ = 'settings'
    key = db.Column(db.String(50), primary_key=True)
    value = db.Column(db.Text, nullable=True)

def get_setting(key, default=None):
    setting = db.session.get(Settings, key)
    return setting.value if setting else default

def set_setting(key, value):
    if value is None:
        return
    setting = db.session.get(Settings, key)
    if setting:
        setting.value = value
    else:
        setting = Settings(key=key, value=value)
        db.session.add(setting)
    db.session.commit()

def save_log_to_db(entry):
    log = Log(
        uuid=entry['id'],
        timestamp=datetime.strptime(entry['timestamp'], '%Y-%m-%d %H:%M:%S'),
        prompt=entry['prompt'],
        attack_vectors=entry.get('attack_vectors'),
        result_json=entry.get('result'),
        request_json=entry.get('request'),
        error=entry.get('error')
    )
    db.session.add(log)
    db.session.commit()

# Configure Logging
logs_dir = os.getenv('LOGS_DIR', 'logs')
if not os.path.exists(logs_dir):
    os.makedirs(logs_dir)

logging.basicConfig(
    filename=os.path.join(logs_dir, os.getenv('LOG_FILENAME', 'application.log')),
    level=logging.INFO,
    format='%(asctime)s\t%(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

def migrate_logs_from_file():
    logs_dir = os.getenv('LOGS_DIR', 'logs')
    log_file = os.path.join(logs_dir, os.getenv('LOG_FILENAME', 'application.log'))
    if not os.path.exists(log_file):
        return

    try:
        with open(log_file, 'r') as f:
            lines = f.readlines()
        
        if not lines:
            return

        new_logs = []
        for line in lines:
            parts = line.strip().split('\t')
            if len(parts) < 3:
                continue
            
            time_str = parts[0]
            prompt = parts[1]
            status = parts[2]
            details = parts[3] if len(parts) > 3 else ""

            try:
                timestamp = datetime.strptime(time_str, '%Y-%m-%d %H:%M:%S')
            except ValueError:
                try:
                    t = datetime.strptime(time_str, '%H:%M:%S').time()
                    timestamp = datetime.combine(datetime.now().date(), t)
                except ValueError:
                    continue

            result_json = None
            error_msg = None
            attack_vectors = []

            if status == 'Success':
                try:
                    result_json = json.loads(details)
                    if result_json.get('breakdown'):
                        for r in result_json['breakdown']:
                            if r.get('detected') and r.get('detector_type'):
                                vector = r['detector_type'].split('/')[-1]
                                if vector not in attack_vectors:
                                    attack_vectors.append(vector)
                except json.JSONDecodeError:
                    pass
            else:
                error_msg = details

            log = Log(
                uuid=str(uuid.uuid4()),
                timestamp=timestamp,
                prompt=prompt,
                attack_vectors=attack_vectors,
                result_json=result_json,
                error=error_msg
            )
            new_logs.append(log)

        if new_logs:
            db.session.bulk_save_objects(new_logs)
            db.session.commit()
            print(f"Migrated {len(new_logs)} logs to DB.")
        
        # Clear the log file after migration
        with open(log_file, 'w') as f:
            f.truncate(0)

    except Exception as e:
        print(f"Migration failed: {e}")

def load_recent_logs_from_db():
    """Load all logs from DB into memory for dashboard analytics"""
    global analysis_logs
    try:
        logs = Log.query.order_by(Log.timestamp.desc()).all()
        analysis_logs = []
        for log in logs:
            entry = {
                'id': log.uuid,
                'timestamp': log.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                'prompt': log.prompt,
                'attack_vectors': log.attack_vectors or [],
                'result': log.result_json,
                'request': log.request_json,
                'error': log.error
            }
            if log.result_json:
                entry['response'] = log.result_json
            analysis_logs.append(entry)
        print(f"Loaded {len(analysis_logs)} logs from database into memory.")
    except Exception as e:
        print(f"Failed to load logs from DB: {e}")
        analysis_logs = []

def get_available_models(api_key):
    """Helper function to fetch available OpenAI models with caching"""
    if not api_key:
        return ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo']
    
    # Check cache
    now = datetime.now()
    if MODEL_CACHE['openai']['data'] and MODEL_CACHE['openai']['timestamp']:
        if now - MODEL_CACHE['openai']['timestamp'] < CACHE_DURATION:
            return MODEL_CACHE['openai']['data']

    try:
        response = requests.get(
            "https://api.openai.com/v1/models",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=2  # Reduced timeout
        )
        if response.status_code == 200:
            models = response.json().get('data', [])
            chat_models = [m['id'] for m in models if 'gpt' in m['id']]
            result = sorted(chat_models, reverse=True)
            
            # Update cache
            MODEL_CACHE['openai']['data'] = result
            MODEL_CACHE['openai']['timestamp'] = now
            return result
            
        return ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo']
    except:
        return ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo']

def get_gemini_models():
    """Helper function to fetch available Gemini models with caching"""
    api_key = get_setting('GEMINI_API_KEY') or os.getenv('GEMINI_API_KEY')
    if not api_key:
        return []
    
    # Check cache
    now = datetime.now()
    if MODEL_CACHE['gemini']['data'] and MODEL_CACHE['gemini']['timestamp']:
        if now - MODEL_CACHE['gemini']['timestamp'] < CACHE_DURATION:
            return MODEL_CACHE['gemini']['data']
    
    try:
        genai.configure(api_key=api_key)
        models = genai.list_models()
        gen_models = [m.name.replace('models/', '') for m in models 
                     if 'generateContent' in m.supported_generation_methods]
        result = sorted(gen_models, reverse=True)
        
        # Update cache
        MODEL_CACHE['gemini']['data'] = result
        MODEL_CACHE['gemini']['timestamp'] = now
        return result
    except Exception as e:
        print(f"Error fetching Gemini models: {e}")
        return ['gemini-flash-lite-latest', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']

def get_ollama_models():
    """Helper function to fetch available Ollama models with caching"""
    ollama_url = get_setting('OLLAMA_API_URL') or os.getenv('OLLAMA_API_URL', 'http://localhost:11434')
    
    # Check cache
    now = datetime.now()
    if MODEL_CACHE['ollama']['data'] and MODEL_CACHE['ollama']['timestamp']:
        if now - MODEL_CACHE['ollama']['timestamp'] < CACHE_DURATION:
            return MODEL_CACHE['ollama']['data']

    try:
        response = requests.get(f"{ollama_url}/api/tags", timeout=2)
        if response.status_code == 200:
            models = response.json().get('models', [])
            result = sorted([m['name'] for m in models])
            
            # Update cache
            MODEL_CACHE['ollama']['data'] = result
            MODEL_CACHE['ollama']['timestamp'] = now
            return result
        return []
    except Exception as e:
        print(f"Error fetching Ollama models: {e}")
        return []

# Initialize DB
with app.app_context():
    db.create_all()
    migrate_logs_from_file()
    load_recent_logs_from_db()

@app.route('/')
def index():
    openai_api_key = get_setting('OPENAI_API_KEY') or os.getenv('OPENAI_API_KEY', '')
    available_models = get_available_models(openai_api_key)
    
    azure_api_key = get_setting('AZURE_OPENAI_API_KEY') or os.getenv('AZURE_OPENAI_API_KEY', '')
    azure_endpoint = get_setting('AZURE_OPENAI_ENDPOINT') or os.getenv('AZURE_OPENAI_ENDPOINT', '')
    azure_deployment = get_setting('AZURE_OPENAI_DEPLOYMENT') or os.getenv('AZURE_OPENAI_DEPLOYMENT', 'gpt-4o-mini-2024-07-18')
    
    gemini_models = get_gemini_models()
    ollama_models = get_ollama_models()
    
    return render_template('playground.html', available_models=available_models, azure_deployment=azure_deployment, gemini_models=gemini_models, ollama_models=ollama_models)

@app.route('/playground')
def playground():
    openai_api_key = get_setting('OPENAI_API_KEY') or os.getenv('OPENAI_API_KEY', '')
    available_models = get_available_models(openai_api_key)
    
    azure_api_key = get_setting('AZURE_OPENAI_API_KEY') or os.getenv('AZURE_OPENAI_API_KEY', '')
    azure_endpoint = get_setting('AZURE_OPENAI_ENDPOINT') or os.getenv('AZURE_OPENAI_ENDPOINT', '')
    azure_deployment = get_setting('AZURE_OPENAI_DEPLOYMENT') or os.getenv('AZURE_OPENAI_DEPLOYMENT', 'gpt-4o-mini-2024-07-18')
    
    gemini_models = get_gemini_models()
    ollama_models = get_ollama_models()
    
    return render_template('playground.html', available_models=available_models, azure_deployment=azure_deployment, gemini_models=gemini_models, ollama_models=ollama_models)

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/logs')
def logs():
    return render_template('logs.html')

@app.route('/settings', methods=['GET', 'POST'])
def settings():
    if request.method == 'POST':
        api_key = request.form.get('api_key')
        project_id = request.form.get('project_id')
        openai_api_key = request.form.get('openai_api_key')
        azure_openai_api_key = request.form.get('azure_openai_api_key')
        azure_openai_endpoint = request.form.get('azure_openai_endpoint')
        azure_openai_deployment = request.form.get('azure_openai_deployment')
        gemini_api_key = request.form.get('gemini_api_key')
        ollama_api_url = request.form.get('ollama_api_url')
        ollama_timeout = request.form.get('ollama_timeout')
        
        set_setting('LAKERA_API_KEY', api_key)
        set_setting('LAKERA_PROJECT_ID', project_id)
        set_setting('OPENAI_API_KEY', openai_api_key)
        set_setting('AZURE_OPENAI_API_KEY', azure_openai_api_key)
        set_setting('AZURE_OPENAI_ENDPOINT', azure_openai_endpoint)
        set_setting('AZURE_OPENAI_DEPLOYMENT', azure_openai_deployment)
        set_setting('GEMINI_API_KEY', gemini_api_key)
        set_setting('OLLAMA_API_URL', ollama_api_url)
        set_setting('OLLAMA_TIMEOUT', ollama_timeout)
        
        # Re-fetch models to ensure the list is up-to-date with the new key if changed
        gemini_models = get_gemini_models()
        ollama_models = get_ollama_models()

        return render_template('settings.html', success=True, 
                             api_key=api_key, project_id=project_id, 
                             openai_api_key=openai_api_key,
                             azure_openai_api_key=azure_openai_api_key, azure_openai_endpoint=azure_openai_endpoint,
                             azure_openai_deployment=azure_openai_deployment,
                             gemini_api_key=gemini_api_key,
                             ollama_api_url=ollama_api_url,
                             ollama_timeout=ollama_timeout,
                             gemini_models=gemini_models,
                             ollama_models=ollama_models)
    
    api_key = get_setting('LAKERA_API_KEY') or os.getenv('LAKERA_API_KEY', '')
    project_id = get_setting('LAKERA_PROJECT_ID') or os.getenv('LAKERA_PROJECT_ID', '')
    openai_api_key = get_setting('OPENAI_API_KEY') or os.getenv('OPENAI_API_KEY', '')
    azure_openai_api_key = get_setting('AZURE_OPENAI_API_KEY') or os.getenv('AZURE_OPENAI_API_KEY', '')
    azure_openai_endpoint = get_setting('AZURE_OPENAI_ENDPOINT') or os.getenv('AZURE_OPENAI_ENDPOINT', '')
    azure_openai_deployment = get_setting('AZURE_OPENAI_DEPLOYMENT') or os.getenv('AZURE_OPENAI_DEPLOYMENT', 'gpt-4o-mini-2024-07-18')
    gemini_api_key = get_setting('GEMINI_API_KEY') or os.getenv('GEMINI_API_KEY', '')
    ollama_api_url = get_setting('OLLAMA_API_URL') or os.getenv('OLLAMA_API_URL', 'http://localhost:11434')
    ollama_timeout = get_setting('OLLAMA_TIMEOUT') or os.getenv('OLLAMA_TIMEOUT', '120')

    gemini_models = get_gemini_models()
    ollama_models = get_ollama_models()

    return render_template('settings.html', 
                         api_key=api_key, project_id=project_id, 
                         openai_api_key=openai_api_key,
                         azure_openai_api_key=azure_openai_api_key, azure_openai_endpoint=azure_openai_endpoint,
                         azure_openai_deployment=azure_openai_deployment,
                         gemini_api_key=gemini_api_key,
                         ollama_api_url=ollama_api_url,
                         ollama_timeout=ollama_timeout,
                         gemini_models=gemini_models,
                         ollama_models=ollama_models)

@app.route('/api/analyze', methods=['POST'])
def analyze():
    """
    Analyze a prompt for potential threats.
    ---
    tags:
      - Analysis
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            prompt:
              type: string
              example: "How do I make a bomb?"
            use_lakera:
              type: boolean
              default: false
            use_lakera_outbound:
              type: boolean
              default: false
            model_provider:
              type: string
              enum: ['openai', 'azure', 'gemini', 'ollama']
              default: 'azure'
            model_name:
              type: string
    responses:
      200:
        description: Analysis result
        schema:
          type: object
          properties:
            prompt:
              type: string
            lakera_result:
              type: object
            lakera_outbound_result:
              type: object
            openai_response:
              type: string
            flagged:
              type: boolean
      400:
        description: Missing prompt
      500:
        description: API Key not configured
    """
    # Try DB first, then env
    api_key = get_setting('LAKERA_API_KEY') or os.getenv('LAKERA_API_KEY')
    if not api_key:
        return jsonify({'error': 'API Key not configured. Please go to Settings.'}), 500

    data = request.json
    prompt = data.get('prompt')
    use_lakera = data.get('use_lakera', False)
    use_lakera_outbound = data.get('use_lakera_outbound', False)
    
    print(f"DEBUG: prompt={prompt}, use_lakera={use_lakera}, use_lakera_outbound={use_lakera_outbound}", flush=True)
    
    if not prompt:
        return jsonify({'error': 'Prompt is required'}), 400

    lakera_result = None
    lakera_outbound_result = None
    lakera_flagged = False
    
    # Common Lakera Config
    url = os.getenv('LAKERA_API_URL', 'https://api.lakera.ai/v2/guard')
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    
    # 1. Lakera Inbound Scan (Conditional)
    if use_lakera:
        payload = {
            "messages": [{"role": "user", "content": prompt}],
            "project_id": get_setting('LAKERA_PROJECT_ID') or os.getenv('LAKERA_PROJECT_ID'),
            "breakdown": True
        }
        try:
            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()
            lakera_result = response.json()
            logging.info(f"Inbound: {prompt}\tSuccess\t{json.dumps(lakera_result)}")
            
            if lakera_result.get('flagged', False):
                lakera_flagged = True
                
        except requests.exceptions.RequestException as e:
            logging.error(f"Lakera API Error: {e}")

    # 2. OpenAI Chat (If safe or skipped)
    openai_response = None
    if not lakera_flagged:
        model_provider = data.get('model_provider', 'azure')
        model_name = data.get('model_name')
        
        if model_provider == 'azure':
            azure_api_key = get_setting('AZURE_OPENAI_API_KEY') or os.getenv('AZURE_OPENAI_API_KEY')
            azure_endpoint = get_setting('AZURE_OPENAI_ENDPOINT') or os.getenv('AZURE_OPENAI_ENDPOINT')
            azure_deployment = get_setting('AZURE_OPENAI_DEPLOYMENT') or os.getenv('AZURE_OPENAI_DEPLOYMENT')
            
            if azure_api_key and azure_endpoint and azure_deployment:
                try:
                    openai_url = f"{azure_endpoint}/openai/deployments/{azure_deployment}/chat/completions?api-version=2024-02-15-preview"
                    openai_headers = {
                        'api-key': azure_api_key,
                        'Content-Type': 'application/json'
                    }
                    openai_payload = {
                        "messages": [{"role": "user", "content": prompt}]
                    }
                    oa_response = requests.post(openai_url, headers=openai_headers, json=openai_payload)
                    oa_response.raise_for_status()
                    openai_data = oa_response.json()
                    openai_response = openai_data['choices'][0]['message']['content']
                except Exception as e:
                    logging.error(f"Azure OpenAI API Error: {e}")
                    openai_response = f"Error calling Azure OpenAI: {str(e)}"
            else:
                openai_response = "Azure OpenAI not configured."
                
        elif model_provider == 'gemini':
            gemini_api_key = get_setting('GEMINI_API_KEY') or os.getenv('GEMINI_API_KEY')
            
            if gemini_api_key:
                try:
                    # Check if re-configuration is needed
                    if GEMINI_CACHE['api_key'] != gemini_api_key:
                        genai.configure(api_key=gemini_api_key)
                        GEMINI_CACHE['api_key'] = gemini_api_key
                        GEMINI_CACHE['model_instance'] = None # Invalidate model if key changes

                    # Determine model name
                    target_model_name = model_name if model_name and model_name.startswith('models/') else f'models/{model_name or "gemini-pro"}'
                    
                    # Check if model instance reuse is possible
                    if GEMINI_CACHE['model_name'] != target_model_name or GEMINI_CACHE['model_instance'] is None:
                        GEMINI_CACHE['model_instance'] = genai.GenerativeModel(target_model_name)
                        GEMINI_CACHE['model_name'] = target_model_name
                    
                    model = GEMINI_CACHE['model_instance']
                    response = model.generate_content(prompt)
                    openai_response = response.text
                    
                except Exception as e:
                    logging.error(f"Gemini API Error: {e}")
                    openai_response = f"Error calling Gemini: {str(e)}"
            else:
                openai_response = "Gemini API key not configured."

        elif model_provider == 'ollama':
            ollama_url = get_setting('OLLAMA_API_URL') or os.getenv('OLLAMA_API_URL', 'http://localhost:11434')
            ollama_timeout = int(get_setting('OLLAMA_TIMEOUT') or os.getenv('OLLAMA_TIMEOUT', 120))
            try:
                payload = {
                    "model": model_name or "llama3",
                    "prompt": prompt,
                    "stream": False
                }
                response = requests.post(f"{ollama_url}/api/generate", json=payload, timeout=ollama_timeout)
                if response.status_code == 200:
                    openai_response = response.json().get('response', '')
                else:
                    openai_response = f"Error calling Ollama: {response.text}"
            except Exception as e:
                logging.error(f"Ollama API Error: {e}")
                openai_response = f"Error calling Ollama: {str(e)}"
                
        else: # Default to OpenAI
            openai_api_key = get_setting('OPENAI_API_KEY') or os.getenv('OPENAI_API_KEY')
            if openai_api_key:
                try:
                    openai_url = os.getenv('OPENAI_API_URL', 'https://api.openai.com/v1/chat/completions')
                    openai_headers = {
                        'Authorization': f'Bearer {openai_api_key}',
                        'Content-Type': 'application/json'
                    }
                    openai_payload = {
                        "model": model_name or 'gpt-4o-mini',
                        "messages": [{"role": "user", "content": prompt}]
                    }
                    logging.info(f"Calling OpenAI with payload: {openai_payload}")
                    oa_response = requests.post(openai_url, headers=openai_headers, json=openai_payload)
                    if oa_response.status_code == 429:
                        openai_response = "Error calling OpenAI: 429 Client Error (Too Many Requests). This usually means you've hit your rate limit or need to add credits to your OpenAI account."
                    else:
                        oa_response.raise_for_status()
                        openai_data = oa_response.json()
                        openai_response = openai_data['choices'][0]['message']['content']
                    
                except Exception as e:
                    logging.error(f"OpenAI API Error: {e}")
                    if not openai_response:
                        openai_response = f"Error calling OpenAI: {str(e)}"
            else:
                openai_response = "OpenAI API Key not configured."

    # 3. Lakera Outbound Scan (Conditional)
    if use_lakera_outbound and openai_response and not openai_response.startswith("Error") and not openai_response.endswith("configured."):
        try:
            outbound_payload = {
                "messages": [{"role": "assistant", "content": openai_response}],
                "project_id": get_setting('LAKERA_PROJECT_ID') or os.getenv('LAKERA_PROJECT_ID'),
                "breakdown": True
            }
            out_response = requests.post(url, headers=headers, json=outbound_payload)
            out_response.raise_for_status()
            lakera_outbound_result = out_response.json()
            logging.info(f"Outbound: {openai_response[:50]}...\tSuccess\t{json.dumps(lakera_outbound_result)}")
        except Exception as e:
            logging.error(f"Lakera Outbound Error: {e}")

    # 3. Log and Return
    inbound_vectors = []
    outbound_vectors = []
    
    # Collect inbound vectors
    if lakera_result and lakera_result.get('breakdown'):
        for r in lakera_result['breakdown']:
            if r.get('detected') and r.get('detector_type'):
                vector = r['detector_type'].split('/')[-1]
                if vector not in inbound_vectors:
                    inbound_vectors.append(vector)
        lakera_result['attack_vectors'] = inbound_vectors
    
    # Collect outbound vectors
    if lakera_outbound_result and lakera_outbound_result.get('breakdown'):
        for r in lakera_outbound_result['breakdown']:
            if r.get('detected') and r.get('detector_type'):
                vector = r['detector_type'].split('/')[-1]
                if vector not in outbound_vectors:
                    outbound_vectors.append(vector)
        lakera_outbound_result['attack_vectors'] = outbound_vectors
    
    # Combined vectors for top-level logging
    attack_vectors = list(set(inbound_vectors + outbound_vectors))

    # Create a consolidated result object for the database
    db_result = {
        'flagged': lakera_flagged or (lakera_outbound_result and lakera_outbound_result.get('flagged', False)),
        'inbound_result': lakera_result,
        'outbound_result': lakera_outbound_result,
        'openai_response': openai_response,
        'attack_vectors': attack_vectors
    }

    log_entry = {
        'id': str(uuid.uuid4()),
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'prompt': prompt,
        'result': db_result,
        'attack_vectors': attack_vectors,
        'request': {'prompt': prompt, 'use_lakera': use_lakera, 'use_lakera_outbound': use_lakera_outbound},
        'response': {'lakera_inbound': lakera_result, 'lakera_outbound': lakera_outbound_result, 'openai': openai_response}
    }
    
    try:
        save_log_to_db(log_entry)
    except Exception as e:
        logging.error(f"Failed to save log to DB: {e}")
        
    analysis_logs.insert(0, log_entry)
    if len(analysis_logs) > 100:
        analysis_logs.pop()

    return jsonify({
        'prompt': prompt,
        'lakera_result': lakera_result,
        'lakera_outbound_result': lakera_outbound_result,
        'openai_response': openai_response,
        'flagged': lakera_flagged
    })

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """
    Get paginated logs.
    ---
    tags:
      - Logs
    parameters:
      - name: start_date
        in: query
        type: string
        format: date
        description: Start date (YYYY-MM-DD)
      - name: end_date
        in: query
        type: string
        format: date
        description: End date (YYYY-MM-DD)
      - name: page
        in: query
        type: integer
        default: 1
      - name: per_page
        in: query
        type: integer
        default: 20
    responses:
      200:
        description: List of logs and pagination info
    """
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))
    
    query = Log.query
    try:
        if start_date:
            query = query.filter(Log.timestamp >= datetime.strptime(start_date, '%Y-%m-%d'))
        if end_date:
            query = query.filter(Log.timestamp <= datetime.strptime(end_date + ' 23:59:59', '%Y-%m-%d %H:%M:%S'))
        
        # Get total count before pagination
        total_logs = query.count()
        total_pages = (total_logs + per_page - 1) // per_page  # Ceiling division
        
        # Apply pagination
        logs = query.order_by(Log.timestamp.desc()).offset((page - 1) * per_page).limit(per_page).all()
        
        return jsonify({
            'logs': [log.to_dict() for log in logs],
            'pagination': {
                'current_page': page,
                'per_page': per_page,
                'total_logs': total_logs,
                'total_pages': total_pages,
                'has_next': page < total_pages,
                'has_prev': page > 1
            }
        })
    except Exception as e:
        logging.error(f"Failed to fetch logs from DB: {e}")
        return jsonify({'logs': [], 'pagination': {'current_page': 1, 'per_page': per_page, 'total_logs': 0, 'total_pages': 0, 'has_next': False, 'has_prev': False}})

@app.route('/api/logs/<log_id>', methods=['DELETE'])
def delete_log(log_id):
    """
    Delete a specific log entry.
    ---
    tags:
      - Logs
    parameters:
      - name: log_id
        in: path
        type: string
        required: true
    responses:
      200:
        description: Log deleted successfully
    """
    Log.query.filter_by(uuid=log_id).delete()
    db.session.commit()
    global analysis_logs
    analysis_logs = [log for log in analysis_logs if log['id'] != log_id]
    return jsonify({'success': True})

@app.route('/api/logs', methods=['DELETE'])
def clear_logs():
    """
    Clear all logs.
    ---
    tags:
      - Logs
    responses:
      200:
        description: All logs cleared successfully
    """
    db.session.query(Log).delete()
    db.session.commit()
    global analysis_logs
    analysis_logs = []
    return jsonify({'success': True})

@app.route('/api/logs/export/json', methods=['GET'])
def export_logs_json():
    """
    Export logs as JSON.
    ---
    tags:
      - Logs
    parameters:
      - name: start_date
        in: query
        type: string
        format: date
      - name: end_date
        in: query
        type: string
        format: date
    responses:
      200:
        description: JSON file download
    """
    from flask import make_response
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    query = Log.query
    try:
        if start_date:
            query = query.filter(Log.timestamp >= datetime.strptime(start_date, '%Y-%m-%d'))
        if end_date:
            query = query.filter(Log.timestamp <= datetime.strptime(end_date + ' 23:59:59', '%Y-%m-%d %H:%M:%S'))
        logs = [log.to_dict() for log in query.order_by(Log.timestamp.desc()).all()]
    except Exception as e:
        logging.error(f"Export JSON failed: {e}")
        logs = []

    json_data = json.dumps(logs, indent=2)
    filename = f"lakera_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    response = make_response(json_data)
    response.headers['Content-Disposition'] = f'attachment; filename={filename}'
    response.headers['Content-Type'] = 'application/json'
    return response


@app.route('/api/logs/export/csv', methods=['GET'])
def export_logs_csv():
    """
    Export logs as CSV.
    ---
    tags:
      - Logs
    parameters:
      - name: start_date
        in: query
        type: string
        format: date
      - name: end_date
        in: query
        type: string
        format: date
    responses:
      200:
        description: CSV file download
    """
    from flask import make_response
    import csv, io
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    query = Log.query
    try:
        if start_date:
            query = query.filter(Log.timestamp >= datetime.strptime(start_date, '%Y-%m-%d'))
        if end_date:
            query = query.filter(Log.timestamp <= datetime.strptime(end_date + ' 23:59:59', '%Y-%m-%d %H:%M:%S'))
        logs = query.order_by(Log.timestamp.desc()).all()
    except Exception as e:
        logging.error(f"Export CSV failed: {e}")
        logs = []

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(['Timestamp', 'Prompt', 'Status', 'Attack Vectors', 'Flagged', 'Error'])
    for log in logs:
        status = 'Error' if log.error else 'Success'
        flagged = 'Yes' if (log.result_json and log.result_json.get('flagged')) else 'No'
        attack_vectors = ', '.join(log.attack_vectors or [])
        error = log.error or ''
        writer.writerow([log.timestamp.strftime('%Y-%m-%d %H:%M:%S'), log.prompt, status, attack_vectors, flagged, error])
    
    csv_data = buffer.getvalue()
    filename = f"lakera_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    response = make_response(csv_data)
    response.headers['Content-Type'] = 'text/csv; charset=utf-8'
    response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response

@app.route('/api/triggers', methods=['GET'])
def get_triggers():
    """
    Get list of attack triggers.
    ---
    tags:
      - Triggers
    responses:
      200:
        description: List of attack triggers
    """
    try:
        with open('data/triggers.json', 'r') as f:
            triggers = json.load(f)
        return jsonify(triggers)
    except FileNotFoundError:
        return jsonify([])
    except Exception as e:
        logging.error(f"Failed to load triggers: {e}")
        return jsonify([])

@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    """
    Get dashboard analytics data.
    ---
    tags:
      - Analytics
    parameters:
      - name: range
        in: query
        type: string
        enum: ['1h', '24h', '7d']
        default: '24h'
    responses:
      200:
        description: Analytics data
    """
    range_param = request.args.get('range', '24h')
    now = datetime.now()
    if range_param == '1h':
        cutoff = now - timedelta(hours=1)
    elif range_param == '7d':
        cutoff = now - timedelta(days=7)
    else:
        cutoff = now - timedelta(hours=24)
    # Use in‑memory logs for timeline calculations
    filtered_logs = [log for log in analysis_logs if datetime.strptime(log['timestamp'], '%Y-%m-%d %H:%M:%S') > cutoff]
    total_scans = len(filtered_logs)
    threats_blocked = sum(
        1 for log in filtered_logs
        if (log.get('result') or {}).get('flagged')
        or (
            (log.get('result') or {}).get('results')
            and any(r.get('flagged') for r in (log.get('result') or {}).get('results', []))
    ))
    threat_categories = {}
    for log in filtered_logs:
        if log.get('attack_vectors'):
            for vector in log['attack_vectors']:
                threat_categories[vector] = threat_categories.get(vector, 0) + 1
    attack_vector_distribution = {}
    for log in filtered_logs:
        if log.get('attack_vectors'):
            for vector in log['attack_vectors']:
                attack_vector_distribution[vector] = attack_vector_distribution.get(vector, 0) + 1
    timeline = {}
    for log in filtered_logs:
        timestamp = log['timestamp']
        if range_param == '1h':
            key = timestamp[11:16]
        elif range_param == '7d':
            key = timestamp[:10]
        else:
            key = timestamp[:13]
        timeline[key] = timeline.get(key, 0) + 1
    return jsonify({
        'total_scans': total_scans,
        'threats_blocked': threats_blocked,
        'success_rate': round((threats_blocked / total_scans * 100) if total_scans > 0 else 0, 1),
        'threat_distribution': threat_categories,
        'attack_vector_distribution': attack_vector_distribution,
        'timeline': timeline,
        'recent_logs': analysis_logs[:10]
    })

if __name__ == '__main__':
    port = int(os.getenv('APP_PORT', 9000))
    app.run(debug=True, port=port)
