from typing import List


TOPIC_SWITCH_KEYWORDS = [
    "换个话题",
    "换个谈资",
    "聊点别的",
    "我们聊",
    "来说说",
    "换个东西聊",
    "换一个话题",
]


class TopicDetector:
    def __init__(self, keywords: List[str] = None):
        self.keywords = keywords if keywords is not None else TOPIC_SWITCH_KEYWORDS

    def detect_topic_switch(self, content: str) -> bool:
        if not content:
            return False
        for keyword in self.keywords:
            if keyword in content:
                return True
        return False


topic_detector = TopicDetector()
