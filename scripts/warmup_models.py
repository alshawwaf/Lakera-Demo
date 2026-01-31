import logging
import sys

# Configure basic logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")

try:
    import os

    # Ensure the model directory exists if specified in HF_HOME
    hf_home = os.getenv("HF_HOME")
    if hf_home:
        os.makedirs(hf_home, exist_ok=True)
        logging.info(f"Using local model cache: {hf_home}")

    from llm_guard.input_scanners import PromptInjection

    # Download the default PromptInjection model (Deberta-v3)
    # This is the only model known to work reliably with llm-guard
    logging.info("Downloading default PromptInjection model (Deberta-v3)...")
    PromptInjection()  # Uses the library's default model

    logging.info("Warmup complete. Model downloaded successfully.")
except Exception as e:
    logging.error(f"Error during model warmup: {e}")
    sys.exit(1)
