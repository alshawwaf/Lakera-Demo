# Lakera Demo

![Lakera Demo](https://img.shields.io/badge/Security-Lakera%20Demo-blueviolet?style=for-the-badge)
![Python](https://img.shields.io/badge/Backend-Flask-green?style=for-the-badge)
![JavaScript](https://img.shields.io/badge/Frontend-ES6%20Modules-yellow?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-lightgrey?style=for-the-badge)

A comprehensive demonstration platform for **Lakera Demo**, showcasing advanced AI security capabilities through real-time prompt analysis, comprehensive threat detection, and interactive visualization tools.

---

## Overview

Lakera Demo is a full-featured web application designed to demonstrate the power of the Lakera Demo security platform. The application provides security professionals and AI developers with a hands-on environment to test, analyze, and understand LLM security vulnerabilities through an intuitive interface.

### Key Capabilities

**Security Playground**

- Split-screen interface enabling efficient prompt testing and analysis
- Support for multiple LLM providers: OpenAI, Azure OpenAI, and Google Gemini
- Real-time traffic flow visualization showing request/response pipelines
- Comprehensive trigger library with 50+ documented attack vectors
- Batch scanning capabilities for automated security testing

**Analytics Dashboard**

- Real-time metrics tracking total scans, threats blocked, and success rates
- Interactive visualization charts for threat distribution and scan activity
- Time-based filtering (1 hour, 24 hours, 7 days)
- Professional PDF report generation for compliance and documentation

**Log Management**

- Complete audit trail of all security scans with full JSON payloads
- Advanced filtering by date range, attack vector, and detection status
- Export functionality supporting both JSON and CSV formats
- Pagination support for handling large datasets efficiently

**Market Analysis & Benchmarking**

- Side-by-side comparison with **Azure AI Content Safety** (Cloud baseline)
- Performance benchmarking against **LLM Guard** (Open-source toolkit)
- Comparative visualization charts showing threat confidence across vendors
- Unified configuration for multi-vendor security evaluation

---

## Architecture

### Technology Stack

**Backend Infrastructure**

- **Flask**: Lightweight Python web framework for API and routing
- **SQLAlchemy**: Database ORM for SQLite-based persistent storage
- **SQLite**: Embedded database for logs and application settings
- **Flasgger**: Automated API documentation generation

**Frontend Technologies**

- **Vanilla JavaScript**: ES6 modules for modular, maintainable code
- **CSS3**: Modern styling with glassmorphism effects and dark mode support
- **Chart.js**: Interactive data visualizations for analytics
- **No Framework Dependencies**: Pure web technologies for maximum flexibility

**AI Integration**

- **Lakera Demo**: Primary security scanning engine
- **OpenAI**: GPT model integration for response generation
- **Azure OpenAI**: Enterprise OpenAI deployment support
- **Google Gemini**: Google's generative AI model support
- **Ollama**: Local LLM support for privacy-focused testing

### Security Features

- Inbound prompt scanning to detect injection attacks before LLM processing
- Outbound response scanning to identify data leakage or harmful content
- Multi-detector threat identification (PII, prompt injection, jailbreak attempts)
- Real-time threat categorization and attack vector classification
- Persistent logging for security auditing and compliance requirements

---

## Getting Started

### Prerequisites

Before installation, ensure you have the following:

- **Python 3.11 or higher**: Required for application runtime
- **Demo API Key**: Obtain from the platform
- **Optional LLM API Keys**: For OpenAI, Azure OpenAI, or Google Gemini integration
- **Ollama** (optional): For local LLM testing (requires running instance)
- **Docker** (optional): For containerized deployment

### CI/CD Pipeline

This project uses GitHub Actions for Continuous Integration and Deployment.

- **Test**: Runs unit tests and linting.
- **Security**: Scans for vulnerabilities using Trivy.
- **Build & Push**: Builds Docker image and pushes to GitHub Container Registry (GHCR).
- **Deploy**: Deploys to the production environment (requires configuration).

### Triggering a Deployment

Deployments are triggered automatically on pushes to the `main` branch after successful tests and security checks.

#### Standard Installation

1. **Clone the Repository**

   ```bash
   git clone Lakera-demo
   cd Lakera-demo
   ```

2. **Create Virtual Environment**

   ```bash
   python -m venv venv
   
   # Windows
   .\venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

3. **Install Dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**

   Copy the example environment file and configure your API keys:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your credentials:

   ```env
   DEMO_API_KEY=your_demo_api_key
   DEMO_PROJECT_ID=your_project_id
   
   # Optional: Configure LLM providers
   OPENAI_API_KEY=your_openai_key
   AZURE_OPENAI_API_KEY=your_azure_key
   GEMINI_API_KEY=your_gemini_key
   
   # Application settings
   APP_PORT=9000
   ```

5. **Initialize and Run**

   ```bash
   python app.py
   ```

   Access the application at `http://127.0.0.1:9000`

#### Docker Deployment

For containerized deployment:

1. **Build the Docker Image**

   ```bash
   docker build -t lakera-demo .
   ```

2. **Run the Container**

   ```bash
   docker run -p 9000:9000 --env-file .env lakera-demo
   ```

### Full Production Environment

For a complete setup with Redis, monitoring, and automated backups:

```bash
# Start all services
docker compose -f docker-compose.production.yml up -d

# With production features (Nginx + automated backups)
docker compose -f docker-compose.production.yml --profile production up -d

# View services
docker compose -f docker-compose.production.yml ps
```

**Services included:**

- Main application with Gunicorn
- Redis for distributed rate limiting
- Redis Commander (web UI at <http://localhost:8081>)
- Nginx reverse proxy (production profile)
- Automated backup service (production profile)

See [Production Environment Guide](docs/PRODUCTION_GUIDE.md) for details.

The application will be accessible at `http://localhost:9000`

---

## Configuration

### Environment Variables

The application supports the following configuration options via `.env`:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DEMO_API_KEY` | Demo API authentication key | Yes | - |
| `DEMO_PROJECT_ID` | Demo project identifier | Yes | - |
| `DEMO_API_URL` | Demo API endpoint | No | `https://api.lakera.ai/v2/guard` |
| `OPENAI_API_KEY` | OpenAI API key | No | - |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key | No | - |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint URL | No | - |
| `AZURE_OPENAI_DEPLOYMENT` | Azure deployment name | No | `gpt-4o-mini-2024-07-18` |
| `GEMINI_API_KEY` | Google Gemini API key | No | - |
| `OLLAMA_API_URL` | Ollama API URL | No | `http://localhost:11434` |
| `OLLAMA_TIMEOUT` | Ollama request timeout (seconds) | No | `120` |
| `APP_PORT` | Application port | No | `9000` |
| `LOGS_DIR` | Log file directory | No | `logs` |
| `LOG_FILENAME` | Log file name | No | `application.log` |

### Runtime Configuration

Additional settings can be configured through the Settings page in the web interface:

- API key management
- Default LLM provider selection
- Model preferences

---

## Usage

### Basic Workflow

1. **Navigate to Playground**: Access the main testing interface
2. **Enter Prompt**: Input text you want to scan for threats
3. **Configure Options**:
   - Enable Lakera Inbound scan for prompt analysis
   - Enable Lakera Outbound scan for response checking
   - Select LLM provider and model
4. **Execute Scan**: Click "Scan Input" to process
5. **Review Results**: Examine the traffic flow visualization and threat detection results

### Batch Testing

1. Access the Trigger Library on the right panel
2. Click "Run All Triggers" to execute automated security testing
3. Monitor progress in the batch scan modal
4. Review detected threats in the scan log

### Analytics and Reporting

1. Navigate to the Dashboard
2. Select time range (1 hour, 24 hours, or 7 days)
3. Review threat distribution and scan activity charts
4. Export PDF reports for documentation

---

## API Documentation

Interactive API documentation is available at `/apidocs/` when the application is running. The documentation includes:

- Complete endpoint specifications
- Request/response schemas
- Example payloads
- Authentication requirements

### Key Endpoints

- `POST /api/analyze` - Analyze a prompt for security threats
- `GET /api/logs` - Retrieve paginated security logs
- `GET /api/analytics` - Get dashboard analytics data
- `GET /api/triggers` - List available attack triggers
- `DELETE /api/logs` - Clear all logs
- `GET /api/logs/export/csv` - Export logs as CSV
- `GET /api/logs/export/json` - Export logs as JSON

---

## Project Structure

```
lakera-demo/
├── app.py                  # Main Flask application
├── Dockerfile              # Container configuration
├── requirements.txt        # Python dependencies
├── .env.example           # Environment template
├── .gitignore             # Git exclusions
├── data/
│   └── triggers.json      # Attack trigger library
├── docs/
│   ├── ARCHITECTURE.md    # Technical architecture
│   └── DEVELOPER_GUIDE.md # Development documentation
├── instance/
│   └── lakera_logs.db     # SQLite database
├── logs/
│   └── application.log    # Application logs
├── static/
│   ├── css/               # Modular stylesheets
│   └── js/                # ES6 JavaScript modules
└── templates/             # Jinja2 HTML templates
```

---

## Development

### Setting Up Development Environment

Refer to the [Developer Guide](docs/DEVELOPER_GUIDE.md) for comprehensive setup instructions, coding standards, and contribution guidelines.

### Running Tests

```bash
# Future implementation
python -m pytest tests/
```

### Code Style

- **Python**: Follow PEP 8 guidelines
- **JavaScript**: Use ES6+ features, 4-space indentation
- **CSS**: Modular architecture with BEM naming convention

### VS Code Configuration

This project includes VS Code settings to properly handle Jinja templates:

**Included Configuration (`.vscode/settings.json`):**

- Associates `.html` files with Jinja-HTML language mode
- Disables auto-formatting for Jinja templates to prevent syntax corruption
- Enables Emmet support in Jinja-HTML files

**Recommended Extension:**

- **[Jinja HTML](https://marketplace.visualstudio.com/items?itemName=samuelcolvin.jinjahtml)**: Provides syntax highlighting for Jinja2 templates

> **Note**: The VS Code HTML formatter may add spaces inside `{{ }}` Jinja brackets, breaking template syntax. The included settings prevent this by using Jinja-HTML mode.

---

## Documentation

Additional resources for developers and users:

- **[Developer Guide](docs/DEVELOPER_GUIDE.md)**: Comprehensive development documentation
- **[Architecture Overview](docs/ARCHITECTURE.md)**: System design and technical details
- **[Production Deployment](docs/PRODUCTION.md)**: Production deployment guide
- **[Configuration Reference](docs/CONFIGURATION.md)**: Complete environment variable reference
- **[Demo Documentation](https://platform.lakera.ai/docs)**: Official API reference

---

## License

This project is licensed under the MIT License. See LICENSE file for details.

---

## Support

For issues, questions, or contributions:

- Open an issue on GitHub
- Consult the documentation
- Contact Lakera support for API-related questions
