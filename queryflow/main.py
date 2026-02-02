"""
QueryFlow - Database Query Tracing & Optimization
FastAPI + HTMX Prototype

A tool for developers to trace, analyze, and optimize database queries.
"""

from fastapi import FastAPI, Form, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import json
import uuid
import os
import re
import sqlparse
from enum import Enum
import random

app = FastAPI(title="QueryFlow", description="Database Query Tracing & Optimization")

# Setup templates
templates = Jinja2Templates(directory="templates")
os.makedirs("templates", exist_ok=True)


# ==================== DATA MODELS ====================

class DatabaseType(str, Enum):
    POSTGRESQL = "postgresql"
    MYSQL = "mysql"
    SQLITE = "sqlite"


class QuerySeverity(str, Enum):
    CRITICAL = "critical"  # > 1000ms
    HIGH = "high"          # 100-1000ms
    MEDIUM = "medium"      # 50-100ms
    LOW = "low"            # 10-50ms
    INFO = "info"          # < 10ms


class QueryIssue(BaseModel):
    type: str
    description: str
    severity: QuerySeverity
    suggestion: str
    impact: str


class QueryTrace(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    query: str
    normalized_query: str
    duration_ms: float
    timestamp: datetime
    database: str
    table: Optional[str] = None
    operation: str  # SELECT, INSERT, UPDATE, DELETE
    rows_returned: int = 0
    rows_affected: int = 0
    issues: List[QueryIssue] = []
    severity: QuerySeverity
    explain_plan: Optional[Dict] = None
    stack_trace: Optional[str] = None


class DatabaseConnection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: DatabaseType
    host: str
    port: int
    database: str
    username: str
    password: str  # In production, encrypt this
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)


class QueryStats(BaseModel):
    total_queries: int
    slow_queries: int
    avg_duration_ms: float
    p95_duration_ms: float
    p99_duration_ms: float
    most_queried_tables: List[Dict[str, Any]]
    slowest_queries: List[QueryTrace]
    common_issues: List[Dict[str, Any]]


# ==================== QUERY ANALYZER ====================

class QueryAnalyzer:
    """Analyzes SQL queries for performance issues"""
    
    @staticmethod
    def normalize_query(query: str) -> str:
        """Normalize query for deduplication"""
        # Remove extra whitespace
        normalized = " ".join(query.split())
        # Replace literals with placeholders
        normalized = re.sub(r"'[^']*'", "'?", normalized)
        normalized = re.sub(r"\b\d+\b", "?", normalized)
        return normalized.lower()
    
    @staticmethod
    def extract_table_name(query: str) -> Optional[str]:
        """Extract main table name from query"""
        patterns = [
            r"from\s+(\w+)",
            r"into\s+(\w+)",
            r"update\s+(\w+)",
            r"table\s+(\w+)",
        ]
        for pattern in patterns:
            match = re.search(pattern, query, re.IGNORECASE)
            if match:
                return match.group(1)
        return None
    
    @staticmethod
    def extract_operation(query: str) -> str:
        """Extract operation type"""
        query_upper = query.upper().strip()
        if query_upper.startswith("SELECT"):
            return "SELECT"
        elif query_upper.startswith("INSERT"):
            return "INSERT"
        elif query_upper.startswith("UPDATE"):
            return "UPDATE"
        elif query_upper.startswith("DELETE"):
            return "DELETE"
        return "OTHER"
    
    @staticmethod
    def analyze_query(query: str, duration_ms: float) -> List[QueryIssue]:
        """Analyze query for issues"""
        issues = []
        query_lower = query.lower()
        
        # Check for N+1 patterns
        if "select" in query_lower and "limit" not in query_lower and "where" in query_lower:
            issues.append(QueryIssue(
                type="Potential N+1 Query",
                description="Query without LIMIT in a loop context may indicate N+1 pattern",
                severity=QuerySeverity.HIGH,
                suggestion="Use JOIN or IN clause to fetch data in single query",
                impact="Significant performance degradation with large datasets"
            ))
        
        # Check for SELECT *
        if re.search(r"select\s+\*", query_lower):
            issues.append(QueryIssue(
                type="SELECT * Detected",
                description="Query fetches all columns unnecessarily",
                severity=QuerySeverity.MEDIUM,
                suggestion="Specify only needed columns to reduce memory and network usage",
                impact="Unnecessary data transfer and memory consumption"
            ))
        
        # Check for missing WHERE clause
        if QueryAnalyzer.extract_operation(query) in ["UPDATE", "DELETE"] and "where" not in query_lower:
            issues.append(QueryIssue(
                type="Missing WHERE Clause",
                description="UPDATE/DELETE without WHERE will affect all rows",
                severity=QuerySeverity.CRITICAL,
                suggestion="Add WHERE clause or use LIMIT",
                impact="Catastrophic data loss risk"
            ))
        
        # Check for LIKE with leading wildcard
        if re.search(r"like\s+'%", query_lower):
            issues.append(QueryIssue(
                type="Inefficient LIKE Pattern",
                description="Leading wildcard in LIKE prevents index usage",
                severity=QuerySeverity.HIGH,
                suggestion="Use full-text search or restructure query",
                impact="Full table scan required, very slow on large tables"
            ))
        
        # Check for OFFSET without LIMIT
        if "offset" in query_lower and "limit" not in query_lower:
            issues.append(QueryIssue(
                type="OFFSET Without LIMIT",
                description="Large offsets are inefficient",
                severity=QuerySeverity.MEDIUM,
                suggestion="Use keyset pagination instead",
                impact="Slow queries with deep pagination"
            ))
        
        # Check duration-based issues
        if duration_ms > 1000:
            issues.append(QueryIssue(
                type="Slow Query",
                description=f"Query took {duration_ms:.0f}ms to execute",
                severity=QuerySeverity.CRITICAL,
                suggestion="Add indexes, optimize query structure, or consider caching",
                impact="Poor user experience, connection pool exhaustion"
            ))
        elif duration_ms > 100:
            issues.append(QueryIssue(
                type="Moderately Slow Query",
                description=f"Query took {duration_ms:.0f}ms to execute",
                severity=QuerySeverity.HIGH,
                suggestion="Review execution plan and consider adding indexes",
                impact="May cause performance issues under load"
            ))
        
        # Check for NOT IN with subquery
        if "not in" in query_lower and "select" in query_lower:
            issues.append(QueryIssue(
                type="Inefficient NOT IN",
                description="NOT IN with subquery can produce unexpected results",
                severity=QuerySeverity.MEDIUM,
                suggestion="Use NOT EXISTS or LEFT JOIN / IS NULL instead",
                impact="Performance issues and potential incorrect results with NULLs"
            ))
        
        # Check for implicit conversions
        if re.search(r"where\s+\w+\s*=\s*['\"]\d+['\"]", query_lower):
            issues.append(QueryIssue(
                type="Implicit Type Conversion",
                description="Comparing string literal to numeric column",
                severity=QuerySeverity.MEDIUM,
                suggestion="Use numeric literal without quotes",
                impact="Prevents index usage, causes type conversion overhead"
            ))
        
        return issues
    
    @staticmethod
    def get_severity(duration_ms: float, issues: List[QueryIssue]) -> QuerySeverity:
        """Determine query severity"""
        if duration_ms > 1000 or any(i.severity == QuerySeverity.CRITICAL for i in issues):
            return QuerySeverity.CRITICAL
        elif duration_ms > 100 or any(i.severity == QuerySeverity.HIGH for i in issues):
            return QuerySeverity.HIGH
        elif duration_ms > 50 or any(i.severity == QuerySeverity.MEDIUM for i in issues):
            return QuerySeverity.MEDIUM
        elif duration_ms > 10:
            return QuerySeverity.LOW
        return QuerySeverity.INFO


# ==================== MOCK DATA GENERATOR ====================

def generate_mock_queries(n: int = 50) -> List[QueryTrace]:
    """Generate realistic mock query traces"""
    queries = []
    tables = ["users", "orders", "products", "categories", "reviews", "inventory"]
    operations = ["SELECT", "INSERT", "UPDATE", "DELETE"]
    
    sample_queries = [
        ("SELECT * FROM users WHERE id = ?", "SELECT", "users"),
        ("SELECT * FROM orders WHERE user_id = ? AND status = ?", "SELECT", "orders"),
        ("INSERT INTO users (name, email) VALUES (?, ?)", "INSERT", "users"),
        ("UPDATE products SET price = ? WHERE id = ?", "UPDATE", "products"),
        ("DELETE FROM reviews WHERE id = ?", "DELETE", "reviews"),
        ("SELECT * FROM orders WHERE created_at > ? ORDER BY created_at DESC LIMIT 10", "SELECT", "orders"),
        ("SELECT * FROM products WHERE name LIKE '%?%'", "SELECT", "products"),
        ("UPDATE users SET last_login = ?", "UPDATE", "users"),  # Missing WHERE
        ("SELECT * FROM inventory WHERE product_id IN (SELECT id FROM products WHERE category_id = ?)", "SELECT", "inventory"),
        ("SELECT COUNT(*) FROM orders WHERE status = 'pending'", "SELECT", "orders"),
    ]
    
    for i in range(n):
        query_template, operation, table = random.choice(sample_queries)
        
        # Generate realistic duration
        base_duration = random.expovariate(1/50)  # Exponential distribution
        if "LIKE '%" in query_template:
            base_duration *= 3  # LIKE with wildcard is slower
        if operation == "UPDATE" and "WHERE" not in query_template:
            base_duration *= 0.1  # Missing WHERE would be fast but dangerous
        
        duration_ms = min(base_duration, 5000)  # Cap at 5 seconds
        
        query = query_template.replace("?", str(random.randint(1, 10000)))
        
        issues = QueryAnalyzer.analyze_query(query, duration_ms)
        severity = QueryAnalyzer.get_severity(duration_ms, issues)
        
        trace = QueryTrace(
            query=query,
            normalized_query=QueryAnalyzer.normalize_query(query),
            duration_ms=round(duration_ms, 2),
            timestamp=datetime.now() - timedelta(minutes=random.randint(0, 60)),
            database="production_db",
            table=table,
            operation=operation,
            rows_returned=random.randint(1, 100) if operation == "SELECT" else 0,
            rows_affected=random.randint(1, 10) if operation != "SELECT" else 0,
            issues=issues,
            severity=severity
        )
        queries.append(trace)
    
    return sorted(queries, key=lambda x: x.timestamp, reverse=True)


# ==================== IN-MEMORY STORAGE ====================

connections_db: Dict[str, DatabaseConnection] = {}
query_traces_db: List[QueryTrace] = generate_mock_queries(100)


# ==================== API ROUTES ====================

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Main dashboard"""
    return templates.TemplateResponse("index.html", {
        "request": request,
        "connections": list(connections_db.values()),
        "recent_queries": query_traces_db[:20]
    })


@app.get("/queries", response_class=HTMLResponse)
async def queries_page(request: Request):
    """Query list page"""
    return templates.TemplateResponse("queries.html", {
        "request": request,
        "queries": query_traces_db
    })


@app.get("/query/{query_id}", response_class=HTMLResponse)
async def query_detail(request: Request, query_id: str):
    """Single query detail page"""
    query = next((q for q in query_traces_db if q.id == query_id), None)
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    return templates.TemplateResponse("query_detail.html", {
        "request": request,
        "query": query
    })


@app.get("/analytics", response_class=HTMLResponse)
async def analytics_page(request: Request):
    """Analytics dashboard"""
    stats = calculate_stats()
    return templates.TemplateResponse("analytics.html", {
        "request": request,
        "stats": stats
    })


@app.get("/connections/new", response_class=HTMLResponse)
async def new_connection_page(request: Request):
    """New connection page"""
    return templates.TemplateResponse("connection_form.html", {
        "request": request,
        "connection": None,
        "db_types": [t.value for t in DatabaseType]
    })


@app.post("/api/connections")
async def create_connection(
    name: str = Form(...),
    type: DatabaseType = Form(...),
    host: str = Form(...),
    port: int = Form(...),
    database: str = Form(...),
    username: str = Form(...),
    password: str = Form(...)
):
    """Create new database connection"""
    connection = DatabaseConnection(
        name=name,
        type=type,
        host=host,
        port=port,
        database=database,
        username=username,
        password=password
    )
    connections_db[connection.id] = connection
    return JSONResponse({"success": True, "connection": connection.dict()})


@app.get("/api/queries")
async def get_queries(
    severity: Optional[str] = None,
    operation: Optional[str] = None,
    table: Optional[str] = None,
    limit: int = 100
):
    """Get queries with optional filters"""
    queries = query_traces_db
    
    if severity:
        queries = [q for q in queries if q.severity.value == severity]
    if operation:
        queries = [q for q in queries if q.operation == operation]
    if table:
        queries = [q for q in queries if q.table == table]
    
    return JSONResponse([q.dict() for q in queries[:limit]])


@app.get("/api/stats")
async def get_stats():
    """Get analytics statistics"""
    stats = calculate_stats()
    return JSONResponse(stats.dict())


def calculate_stats() -> QueryStats:
    """Calculate query statistics"""
    if not query_traces_db:
        return QueryStats(
            total_queries=0,
            slow_queries=0,
            avg_duration_ms=0,
            p95_duration_ms=0,
            p99_duration_ms=0,
            most_queried_tables=[],
            slowest_queries=[],
            common_issues=[]
        )
    
    durations = [q.duration_ms for q in query_traces_db]
    sorted_durations = sorted(durations)
    n = len(sorted_durations)
    
    # Calculate percentiles
    p95_idx = int(n * 0.95)
    p99_idx = int(n * 0.99)
    
    # Table stats
    table_counts = {}
    for q in query_traces_db:
        if q.table:
            table_counts[q.table] = table_counts.get(q.table, 0) + 1
    
    most_queried_tables = [
        {"table": table, "count": count}
        for table, count in sorted(table_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    ]
    
    # Common issues
    issue_counts = {}
    for q in query_traces_db:
        for issue in q.issues:
            issue_counts[issue.type] = issue_counts.get(issue.type, 0) + 1
    
    common_issues = [
        {"type": issue_type, "count": count}
        for issue_type, count in sorted(issue_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    ]
    
    return QueryStats(
        total_queries=len(query_traces_db),
        slow_queries=len([q for q in query_traces_db if q.duration_ms > 100]),
        avg_duration_ms=round(sum(durations) / len(durations), 2),
        p95_duration_ms=round(sorted_durations[min(p95_idx, n-1)], 2),
        p99_duration_ms=round(sorted_durations[min(p99_idx, n-1)], 2),
        most_queried_tables=most_queried_tables,
        slowest_queries=sorted(query_traces_db, key=lambda x: x.duration_ms, reverse=True)[:10],
        common_issues=common_issues
    )


@app.post("/api/trace")
async def trace_query(query_data: Dict[str, Any]):
    """Receive a new query trace from instrumentation"""
    query = query_data.get("query", "")
    duration_ms = query_data.get("duration_ms", 0)
    
    issues = QueryAnalyzer.analyze_query(query, duration_ms)
    severity = QueryAnalyzer.get_severity(duration_ms, issues)
    
    trace = QueryTrace(
        query=query,
        normalized_query=QueryAnalyzer.normalize_query(query),
        duration_ms=duration_ms,
        timestamp=datetime.now(),
        database=query_data.get("database", "unknown"),
        table=QueryAnalyzer.extract_table_name(query),
        operation=QueryAnalyzer.extract_operation(query),
        rows_returned=query_data.get("rows_returned", 0),
        rows_affected=query_data.get("rows_affected", 0),
        issues=issues,
        severity=severity,
        stack_trace=query_data.get("stack_trace")
    )
    
    query_traces_db.insert(0, trace)
    
    return JSONResponse({
        "success": True,
        "trace_id": trace.id,
        "issues_found": len(issues),
        "severity": severity.value
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
