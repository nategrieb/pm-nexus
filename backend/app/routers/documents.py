from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.document import Document
from app.schemas.document import DocumentCreate, DocumentRead

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("/", response_model=list[DocumentRead])
async def list_documents(
    project_id: int | None = None, db: AsyncSession = Depends(get_db)
):
    query = select(Document)
    if project_id is not None:
        query = query.where(Document.project_id == project_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=DocumentRead)
async def create_document(data: DocumentCreate, db: AsyncSession = Depends(get_db)):
    doc = Document(project_id=data.project_id, doc_type=data.doc_type, url=data.url, title=data.title)
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.delete("/{doc_id}")
async def delete_document(doc_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    await db.delete(doc)
    await db.commit()
    return {"status": "deleted"}
