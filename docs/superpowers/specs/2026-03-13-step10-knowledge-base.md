# Step 10: 知识库设计

## 状态
跳过（需要 ChromaDB 等外部依赖）

## 原始设计（待实现）
- 文档上传 + 文本提取（PDF, TXT, MD, URL）
- 文档分块（LangChain TextSplitter）
- 向量化（BGE 或 sentence-transformers）
- 存储到 ChromaDB
- 检索（top_k=3）
- 检索结果注入

## 文件
- `backend/app/models/knowledge_base.py`
- `backend/app/core/knowledge_base.py`
- `backend/app/services/embedding_service.py`
- `backend/app/api/knowledge.py`
- `frontend/src/components/KnowledgeBaseUpload.tsx`
