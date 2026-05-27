import asyncio
import json
import os
from typing import Any

from dotenv import load_dotenv
from mcp import types
from mcp.server import Server
from mcp.server.stdio import stdio_server
from minio import Minio
from minio.error import S3Error

load_dotenv()

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "")
MINIO_SECURE = os.getenv("MINIO_SECURE", "false").lower() == "true"
MAX_OBJECT_SIZE_MB = int(os.getenv("MAX_OBJECT_SIZE_MB", "10"))

minio_client = Minio(
    endpoint=MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=MINIO_SECURE,
)

server = Server("minio-readonly")


@server.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="list_buckets",
            description="MinIO의 전체 버킷 목록을 조회합니다.",
            inputSchema={"type": "object", "properties": {}},
        ),
        types.Tool(
            name="list_objects",
            description="특정 버킷 안의 파일 목록을 조회합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "bucket": {"type": "string", "description": "버킷 이름"},
                    "prefix": {"type": "string", "description": "경로 필터 (선택)"},
                    "recursive": {"type": "boolean", "description": "하위 폴더 포함 여부 (기본: false)"},
                },
                "required": ["bucket"],
            },
        ),
        types.Tool(
            name="get_object_info",
            description="파일의 크기, 타입, 수정일 등 정보를 조회합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "bucket": {"type": "string", "description": "버킷 이름"},
                    "object_name": {"type": "string", "description": "파일 경로"},
                },
                "required": ["bucket", "object_name"],
            },
        ),
        types.Tool(
            name="read_object",
            description=f"텍스트 파일 내용을 읽습니다. (최대 {MAX_OBJECT_SIZE_MB}MB)",
            inputSchema={
                "type": "object",
                "properties": {
                    "bucket": {"type": "string", "description": "버킷 이름"},
                    "object_name": {"type": "string", "description": "파일 경로"},
                    "encoding": {"type": "string", "description": "인코딩 (기본: utf-8)"},
                },
                "required": ["bucket", "object_name"],
            },
        ),
    ]


def handle_tool(name: str, arguments: dict) -> Any:
    if name == "list_buckets":
        buckets = minio_client.list_buckets()
        return [{"name": b.name, "created": str(b.creation_date)} for b in buckets]

    if name == "list_objects":
        objects = minio_client.list_objects(
            arguments["bucket"],
            prefix=arguments.get("prefix", ""),
            recursive=arguments.get("recursive", False),
        )
        return [
            {
                "name": obj.object_name,
                "size_bytes": obj.size,
                "last_modified": str(obj.last_modified),
                "is_dir": obj.is_dir,
            }
            for obj in objects
        ]

    if name == "get_object_info":
        stat = minio_client.stat_object(arguments["bucket"], arguments["object_name"])
        return {
            "name": stat.object_name,
            "size_bytes": stat.size,
            "content_type": stat.content_type,
            "last_modified": str(stat.last_modified),
        }

    if name == "read_object":
        bucket = arguments["bucket"]
        object_name = arguments["object_name"]
        encoding = arguments.get("encoding", "utf-8")
        stat = minio_client.stat_object(bucket, object_name)
        max_bytes = MAX_OBJECT_SIZE_MB * 1024 * 1024
        if stat.size > max_bytes:
            return {"error": f"파일이 너무 큽니다 ({stat.size:,} bytes). 최대: {MAX_OBJECT_SIZE_MB}MB"}
        response = minio_client.get_object(bucket, object_name)
        try:
            content = response.read().decode(encoding)
        finally:
            response.close()
            response.release_conn()
        return {"content": content, "size_bytes": stat.size}

    return {"error": f"알 수 없는 툴: {name}"}


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    try:
        result = await asyncio.to_thread(handle_tool, name, arguments)
    except S3Error as e:
        result = {"error": f"MinIO 오류: {e.code} - {e.message}"}
    except Exception as e:
        result = {"error": str(e)}
    return [types.TextContent(type="text", text=json.dumps(result, ensure_ascii=False, indent=2))]


async def main() -> None:
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
