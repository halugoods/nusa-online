# NUSA Toko Online — Product Requirements Document

## Overview
A customer-facing online storefront for NUSA Kasir users. Each store owner gets a unique URL (`nusa-online.vercel.app/toko/[activation-key]`) where customers can browse products, place orders, and track order status.

## Tech Stack
- Next.js 14 App Router
- Tailwind CSS
- Supabase (PostgreSQL + Realtime)
- Deployed on Vercel

## Features

### 1. Landing Page (`/`)
- NUSA branding with logo and description
- Download APK link to GitHub releases
- Simple, centered layout

### 2. Store Frontend (`/toko/[storeId]`)
- Dynamic route per store (storeId = activation key)
- Fetch store settings and products from Supabase
- Show store name, open hours in header
- Product grid with category filter and search
- Product cards with name, price, stock status, image placeholder
- Tap card to add to cart
- Sticky cart button at bottom with item count and total

### 3. Cart View
- List all cart items with quantity controls (+/-)
- Show unit price, qty, subtotal per item
- Clear cart button
- Subtotal summary
- Navigate to checkout

### 4. Checkout
- Customer name (required)
- WhatsApp number (required)
- Pickup time selection (Segera/30min/1jam/2jam/Besok)
- Payment method (Tunai/QRIS/Transfer)
- Optional notes
- Order summary review
- Submit to Supabase online_orders table

### 5. Order Success
- Green checkmark confirmation
- Display invoice number
- Buttons: Back to shop, Track order

### 6. Order Tracking (Lacak)
- Enter WhatsApp number to search
- List orders with status badges (color-coded)
- Cancel order button for "Online Baru" status only
- Show: invoice, items, date, payment method, total

## Routes
| Path | Description |
|---|---|
| `/` | Landing page |
| `/toko/[storeId]` | Dynamic storefront (SPA with 5 internal views) |
| `/_not-found` | Built-in 404 |

## API / Data
- Supabase tables: store_settings, online_products, online_orders
- RLS: public read for active stores/published products, public insert orders
- No authentication required for customers
