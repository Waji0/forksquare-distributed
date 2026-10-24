# 🍽️ ForkSquare Distributed

> A production-grade distributed food ordering platform demonstrating 16 weeks of Distributed Database Systems concepts.

[![CI](https://github.com/Waji0/forksquare-distributed/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/forksquare-distributed/actions/workflows/ci.yml)
[![Test Coverage](https://img.shields.io/badge/coverage-97%25-brightgreen)](./apps/api/coverage/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/Node-20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

A **distributed food delivery platform** built as the course project for **CS 606 — Distributed Database Systems**. The application demonstrates real implementations of consensus algorithms, distributed transactions, sharding, replication, and event-driven architecture across **6 database engines** and **3 consensus systems**.

## ✨ Highlights

- 🔐 **Real 2PC** using PostgreSQL `PREPARE TRANSACTION` with blocking problem demonstration
- 🗳️ **Real Raft Consensus** via a 3-node etcd cluster
- 🐘 **Real Streaming Replication** (PostgreSQL primary + hot standby)
- 🧩 **Real Table Partitioning** (HASH by user_id, RANGE by timestamp)
- 🦎 **Real Distributed SQL** via CockroachDB with automatic range sharding
- 💳 **Real Stripe** payment processing (test mode)
- 📧 **Real Email Delivery** via Nodemailer + Mailtrap
- ☁️ **Real CDN Uploads** via Cloudinary
- 📊 **Real Monitoring** via Prometheus + Grafana
- 🧪 **97% test coverage** on distributed algorithms (66 unit tests)
- 🚀 **GitHub Actions CI** pipeline (TypeCheck + Tests + Build)

## 🏗️ Architecture

                        ┌─────────────────┐
                        │   React + Vite  │
                        │   (Frontend)    │
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │   Express API   │
                        │   (Node.js)     │
                        └────────┬────────┘
                                 │
    ┌────────────────────────────┼────────────────────────────┐
    │                            │                            │
    ┌─────▼──────┐ ┌────────▼────────┐ ┌──────▼───────┐
│ PostgreSQL │ │ CockroachDB │ │ etcd │
│ (Primary │ │ (Distributed │ │ (3-node │
│ + Hot │ │ SQL) │ │ Raft) │
│ Standby) │ └────────┬────────┘ └──────┬───────┘
└─────┬──────┘ │ │
│ │ │
┌─────▼──────┐ ┌────────▼────────┐ ┌──────▼───────┐
│ Redis │ │ ClickHouse │ │ Neo4j │
│ (Cache + │ │ (Columnar │ │ (Graph) │
│ Locks) │ │ Analytics) │ │ │
└─────┬──────┘ └────────┬────────┘ └──────┬───────┘
│ │ │
┌─────▼──────┐ ┌────────▼────────┐ ┌──────▼───────┐
│ MongoDB │ │ Kafka │ │ Prometheus │
│ (Menus) │ │ (Redpanda) │ │ + Grafana │
└────────────┘ └─────────────────┘ └──────────────┘


