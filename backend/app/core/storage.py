import os
import uuid
import aiofiles
from fastapi import UploadFile, HTTPException

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)


async def save_upload_file(file: UploadFile, folder: str = "general") -> dict:
    """Сохраняет загружаемый файл на диск в директорию uploads/<folder>/"""
    target_dir = os.path.join(UPLOAD_DIR, folder)
    os.makedirs(target_dir, exist_ok=True)

    ext = os.path.splitext(file.filename)[1]
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(target_dir, unique_name)

    content = await file.read()
    size = len(content)

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    rel_path = f"/uploads/{folder}/{unique_name}"
    return {
        "file_name": file.filename,
        "file_path": rel_path,
        "file_size": size,
        "absolute_path": file_path,
    }
