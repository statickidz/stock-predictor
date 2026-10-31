from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class ModelSpec:
    key: str
    name: str
    model_id: str
    tokenizer_id: str
    max_context: int
    parameters: str
    description: str

    def to_dict(self):
        return asdict(self)


MODELS = (
    ModelSpec("mini", "Kronos Mini", "NeoQuasar/Kronos-mini", "NeoQuasar/Kronos-Tokenizer-2k", 2048, "4.1M", "Smallest download and memory footprint."),
    ModelSpec("small", "Kronos Small", "NeoQuasar/Kronos-small", "NeoQuasar/Kronos-Tokenizer-base", 512, "24.7M", "The default model for everyday exploration."),
    ModelSpec("base", "Kronos Base", "NeoQuasar/Kronos-base", "NeoQuasar/Kronos-Tokenizer-base", 512, "102.3M", "Larger download and memory footprint."),
)


def configured_model(settings) -> ModelSpec:
    for model in MODELS:
        if model.model_id == settings.model_id and model.tokenizer_id == settings.tokenizer_id:
            return model
    return ModelSpec("configured", "Configured model", settings.model_id, settings.tokenizer_id, 512, "Custom", "Custom model configured on this server.")


def available_models(settings) -> tuple[ModelSpec, ...]:
    configured = configured_model(settings)
    return MODELS + ((configured,) if configured.key == "configured" else ())


def resolve_model(key: str | None, settings) -> ModelSpec:
    if key is None:
        return configured_model(settings)
    for model in available_models(settings):
        if model.key == key:
            return model
    raise ValueError("Choose a supported Kronos model from the list.")
