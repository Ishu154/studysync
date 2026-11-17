# 📊 StudyBot Benchmark Report

**Execution Date**: 2026-11-13T07:22:06.021Z  
**Total Test Prompts**: 40 across 5 diagram domains and 3 difficulty tiers.  
**Models Evaluated**:  
- **Cloud Provider**: `gpt-4o-mini` (OpenAI-compatible server tool-calling)  
- **Local Provider**: `Qwen2.5-0.5B-Instruct-q4f16_1` (Client-side WebLLM via WebGPU in Web Worker)  

## 1. Overall Provider Comparison

| Metric | Cloud Provider (`gpt-4o-mini`) | Local Provider (`Qwen2.5-0.5B`) | Advantage |
| :--- | :--- | :--- | :--- |
| **Schema Validation Rate** | **97.5%** (39/40) | **95%** (38/40) | Cloud (+2.5%) |
| **Overall Correctness Score** | **96.3%** | **93.9%** | Cloud (+2.4%) |
| **Time to First Op (TTFO)** | 382 ms | **259 ms** | Local (123 ms faster) |
| **Total Completion Time** | **8092 ms** | 12568 ms | Cloud (4476 ms faster) |
| **Generation Throughput** | **48.3 tps** | 30.2 tps | Cloud (18.1 tps) |
| **Cost (40 benchmark runs)** | $0.0120 | **$0.0000 (Free)** | Local (100% savings) |
| **Cost per 1,000 diagrams** | $0.30 | **$0.00** | Local |
| **Client Download Footprint** | **0 MB** | 350.2 MB | Cloud (Instant start) |
| **Client Memory (VRAM/RAM)** | **0 MB** | ~850 MB VRAM | Cloud (Low hardware barrier) |
| **Offline Operation** | ❌ Requires Internet | **✅ 100% Offline / Private** | Local |

## 2. Accuracy & Latency Breakdown by Difficulty Tier

| Difficulty | Prompts | Cloud Correctness | Local Correctness | Delta | Cloud Total Time | Local Total Time |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **EASY** | 10 | 99.2% | 99.2% | +0.0% | 5439 ms | 8496 ms |
| **MEDIUM** | 15 | 95.7% | 94.7% | +1.0% | 7951 ms | 12680 ms |
| **HARD** | 15 | 94.9% | 89.7% | +5.2% | 10002 ms | 15170 ms |

> [!NOTE]
> On **Easy** diagrams (3-5 nodes, simple linear flow), Local 0.5B performs comparably to Cloud (99.2% vs 99.2%) with lower initial latency. On **Hard** diagrams (8-12 nodes, cyclic state machines, relational schemas), Cloud's larger context and parameter scale achieves a substantial correctness advantage (94.9% vs 89.7%).

## 3. Performance Breakdown by Diagram Type

| Diagram Type | Cloud Correctness | Local Correctness | Cloud Valid Rate | Local Valid Rate | Cloud Time | Local Time |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Binary Tree** | 99.2% | 96.9% | 100% | 100% | 9040 ms | 13988 ms |
| **Flowchart** | 95.8% | 93.9% | 100% | 100% | 9152 ms | 14441 ms |
| **Mind Map** | 91% | 89.6% | 100% | 100% | 8118 ms | 12914 ms |
| **State Machine** | 96.1% | 93.3% | 87.5% | 87.5% | 7286 ms | 11143 ms |
| **ER Diagram** | 99.2% | 96% | 100% | 87.5% | 6866 ms | 10354 ms |

## 4. Key Findings & Tradeoff Matrix

1. **When to use Cloud**: Ideal for complex multi-entity ER diagrams, complex state machines with guards/cycles, and users on low-spec hardware or mobile devices without WebGPU.
2. **When to use Local (WebLLM)**: Ideal for classrooms, offline study groups, privacy-sensitive environments where data cannot leave the browser, and cost-constrained deployments with zero ongoing API expenses.
3. **Auto Mode Effectiveness**: The implemented `Auto` mode offers the ideal hybrid path: it tests WebGPU capability and attempts instant local generation for high privacy and zero latency, gracefully falling back to Cloud if WebGPU is unsupported or validation fails.

