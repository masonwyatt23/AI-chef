# replit.md

## Overview

This is a full-stack AI Chef Assistant application built with React, Express, and PostgreSQL. The application provides an intelligent culinary consultation system for restaurants, offering menu development, kitchen efficiency optimization, and culinary expertise through an AI-powered chat interface.

## System Architecture

The application follows a modern full-stack architecture with clear separation between client and server:

- **Frontend**: React with TypeScript, using Vite as the build tool
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **UI Framework**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **State Management**: TanStack Query for server state management

## Key Components

### Backend Architecture
- **Express Server**: RESTful API server with middleware for logging and error handling
- **Storage Layer**: Abstract storage interface with in-memory implementation for development
- **AI Service**: Integration with OpenAI/xAI for chef consultation capabilities
- **Database Schema**: Drizzle ORM with PostgreSQL dialect for data persistence

### Frontend Architecture
- **Component Structure**: Modular React components with shadcn/ui design system
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **API Layer**: Centralized API request handling with React Query

### Database Schema
The application uses the following main entities:
- **Users**: Basic user authentication (prepared for future use)
- **Restaurants**: Core restaurant context including theme, capabilities, and staff size
- **Conversations**: Chat sessions between users and the AI chef
- **Messages**: Individual messages within conversations
- **Recommendations**: AI-generated suggestions that can be tracked and implemented

## Data Flow

1. **Restaurant Setup**: Users configure their restaurant context (theme, categories, capabilities)
2. **Chat Interface**: Users interact with the AI chef through a conversational interface
3. **AI Processing**: Messages are sent to the AI service with restaurant context for personalized responses
4. **Recommendations**: AI generates actionable recommendations categorized by type (menu, efficiency, cocktails, flavor-pairing)
5. **Tracking**: Users can mark recommendations as implemented and export summaries

## External Dependencies

### AI Integration
- **Primary**: xAI API (with OpenAI as fallback)
- **Configuration**: Environment variable `XAI_API_KEY` or `OPENAI_API_KEY`
- **Purpose**: Provides expert chef consultation and recipe generation

### Database
- **Provider**: Neon Database (PostgreSQL)
- **Configuration**: `DATABASE_URL` environment variable
- **ORM**: Drizzle with PostgreSQL dialect

### UI Components
- **Design System**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties
- **Icons**: Lucide React icons

## Deployment Strategy

### Development
- **Frontend**: Vite dev server with HMR
- **Backend**: tsx for TypeScript execution with nodemon-like behavior
- **Database**: Drizzle migrations with push command

### Production
- **Build Process**: 
  - Frontend: Vite build outputs to `dist/public`
  - Backend: esbuild bundles server to `dist/index.js`
- **Static Assets**: Express serves built frontend from `dist/public`
- **Environment**: Production mode with optimized builds

### Replit Integration
- **Development Tools**: Replit-specific plugins for error overlay and cartographer
- **Configuration**: Custom vite config with conditional Replit plugins

## Recent Updates

### Streamlined AI Chef Assistant (June 27, 2025)
- **Removed Operations Dashboard**: Eliminated hardcoded analytics in favor of focused functionality
- **Enhanced Menu & Cocktail Generator**: Advanced AI-powered generation with comprehensive customization
- **Database Integration**: PostgreSQL persistence with Drizzle ORM for restaurant data and recommendations
- **Simplified Interface**: Three-tab system focusing on core restaurant needs

### Core Features
- **Smart Menu Generation**: Dynamic AI creation of menu items with cost analysis, profit margins, and detailed recipes
- **Advanced Cocktail Creation**: Sophisticated cocktail generator with complexity levels, batch preparation, and food pairings  
- **Restaurant Context**: Comprehensive setup capturing theme, capabilities, staff size, and custom requirements
- **AI Chef Consultation**: Interactive chat interface for culinary advice and operational guidance
- **Export Functionality**: Complete recipe and cost data export for implementation

### Technical Architecture
- **Clean Data Flow**: No hardcoded information - all outputs generated from restaurant context and AI
- **Type Safety**: Fixed null/undefined type issues for reliable data handling
- **Production Ready**: PostgreSQL database with proper schema relationships and error handling

## Changelog

```
Changelog:
- June 27, 2025: Major platform enhancement - Added database integration and comprehensive restaurant operations dashboard
- June 27, 2025: Enhanced UI/UX with improved chat interface and fixed layout issues  
- June 27, 2025: Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```