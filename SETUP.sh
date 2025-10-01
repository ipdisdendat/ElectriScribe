#!/bin/bash
# Infinitea ElectriScribe - Local Setup Script

echo "Setting up Infinitea ElectriScribe..."

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your Supabase credentials"
echo "2. Apply migrations from supabase/migrations/ to your Supabase project"
echo "3. Run: npm run dev"
echo ""
