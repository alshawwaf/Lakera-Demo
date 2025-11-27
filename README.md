# Lakera Demo

![Lakera Demo](https://img.shields.io/badge/Security-Lakera%20Guard-blueviolet?style=for-the-badge)
![Python](https://img.shields.io/badge/Backend-Flask-green?style=for-the-badge)
![JavaScript](https://img.shields.io/badge/Frontend-ES6%20Modules-yellow?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-lightgrey?style=for-the-badge)

A comprehensive demonstration platform for **Lakera Guard**, showcasing advanced AI security capabilities through real-time prompt analysis, comprehensive threat detection, and interactive visualization tools.

---

## Overview

Lakera Demo is a full-featured web application designed to demonstrate the power of Lakera Guard's AI security platform. The application provides security professionals and AI developers with a hands-on environment to test, analyze, and understand LLM security vulnerabilities through an intuitive interface.

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
- **Lakera Guard**: Primary security scanning engine
- **OpenAI**: GPT model integration for response generation
- **Azure OpenAI**: Enterprise OpenAI deployment support
- **Google Gemini**: Google's generative AI model support

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
- **Lakera Guard API Key**: Obtain from [Lakera Platform](https://platform.lakera.ai)
- **Optional LLM API Keys**: For OpenAI, Azure OpenAI, or Google Gemini integration
- **Docker** (optional): For containerized deployment

### Installation

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
   LAKERA_API_KEY=your_lakera_api_key
   LAKERA_PROJECT_ID=your_project_id
   
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

The application will be accessible at `http://localhost:9000`

---

## Configuration

### Environment Variables

The application supports the following configuration options via `.env`:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `LAKERA_API_KEY` | Lakera Guard API authentication key | Yes | - |
| `LAKERA_PROJECT_ID` | Lakera project identifier | Yes | - |
| `LAKERA_API_URL` | Lakera API endpoint | No | `https://api.lakera.ai/v2/guard` |
| `OPENAI_API_KEY` | OpenAI API key | No | - |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key | No | - |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint URL | No | - |
| `AZURE_OPENAI_DEPLOYMENT` | Azure deployment name | No | `gpt-4o-mini-2024-07-18` |
| `GEMINI_API_KEY` | Google Gemini API key | No | - |
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

---

## Contributing

We welcome contributions to improve the Lakera Demo platform. Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/enhancement`)
3. Commit your changes with descriptive messages
4. Push to your branch (`git push origin feature/enhancement`)
5. Open a Pull Request with a detailed description

---

## Documentation

Additional resources for developers and users:

- **[Developer Guide](docs/DEVELOPER_GUIDE.md)**: Comprehensive development documentation
- **[Architecture Overview](docs/ARCHITECTURE.md)**: System design and technical details
- **[Production Deployment](docs/PRODUCTION.md)**: Production deployment guide
- **[Configuration Reference](docs/CONFIGURATION.md)**: Complete environment variable reference
- **[Lakera Guard Documentation](https://platform.lakera.ai/docs)**: Official Lakera Guard API reference


