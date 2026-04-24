"""
Lista curada de repos clave del ecosistema IA open source.

Criterio de selección:
- Alto impacto en investigación o producción de IA.
- Comunidad activa de contributors (no un solo autor).
- Mezcla temporal: unos nacen ~2015-2016 (sklearn, tf, pytorch) y otros ~2022-2024
  (langchain, llama, vllm) — así el chart histórico refleja la evolución real.

La categoría es informativa, no se usa para queries (aún).
"""

CURATED_REPOS = [
    # Frameworks fundacionales
    ("pytorch/pytorch",                "framework"),
    ("tensorflow/tensorflow",          "framework"),
    ("google/jax",                     "framework"),
    ("keras-team/keras",               "framework"),
    ("Lightning-AI/pytorch-lightning", "framework"),

    # ML clásico / base
    ("scikit-learn/scikit-learn",      "ml"),

    # Ecosistema Hugging Face
    ("huggingface/transformers",       "llm"),
    ("huggingface/diffusers",          "vision"),
    ("huggingface/datasets",           "data"),
    ("huggingface/peft",               "llm"),
    ("huggingface/accelerate",         "infra"),

    # LLMs modernos (app layer)
    ("langchain-ai/langchain",         "llm"),
    ("run-llama/llama_index",          "llm"),
    ("vllm-project/vllm",              "infra"),
    ("ollama/ollama",                  "llm"),

    # Modelos / research abiertos
    ("openai/whisper",                 "audio"),
    ("meta-llama/llama",               "llm"),
    ("facebookresearch/fairseq",       "llm"),

    # Visión
    ("ultralytics/ultralytics",        "vision"),
    ("open-mmlab/mmdetection",         "vision"),
]
