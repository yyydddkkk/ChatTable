from typing import Any

LENGTH_PROMPTS: dict[int, str] = {
    1: "请用一句话回答，最多 20 字。",
    2: "请简洁回答，50 字以内。",
    3: "请正常长度回答。",
    4: "请详细回答，充分说明。",
    5: "请尽可能详细地回答，包含所有细节。",
}

LENGTHEN_TRIGGERS: list[str] = [
    "详细点",
    "多说点",
    "详细一些",
    "多说说",
    "展开说说",
]

SHORTEN_TRIGGERS: list[str] = [
    "简短点",
    "少说点",
    "简单说",
    "简洁点",
]


class LengthController:
    def get_length_prompt(self, level: int) -> str:
        return LENGTH_PROMPTS.get(level, LENGTH_PROMPTS[3])

    def detect_trigger(self, content: str) -> int | None:
        for trigger in LENGTHEN_TRIGGERS:
            if trigger in content:
                return 1
        for trigger in SHORTEN_TRIGGERS:
            if trigger in content:
                return -1
        return None

    def inject_length_prompt(
        self, messages: list[dict[str, Any]], length_level: int
    ) -> list[dict[str, Any]]:
        length_prompt = self.get_length_prompt(length_level)
        injected_messages = list(messages)
        if injected_messages:
            last_message = injected_messages[-1].copy()
            last_message["content"] = (
                last_message.get("content", "") + "\n\n" + length_prompt
            )
            injected_messages[-1] = last_message
        return injected_messages


length_controller = LengthController()
