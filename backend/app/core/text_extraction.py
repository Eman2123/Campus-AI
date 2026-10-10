import io
import os


def extract_text(content: bytes, filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()

    if ext in (".txt", ".md"):
        return content.decode("utf-8", errors="replace")

    if ext == ".pdf":
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(content))
        return "\n\n".join(page.extract_text() or "" for page in reader.pages)

    if ext == ".docx":
        from docx import Document as DocxDocument

        doc = DocxDocument(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs)

    raise ValueError(f"No text extractor for file type '{ext}'")
