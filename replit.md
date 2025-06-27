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

### Database Integration (June 27, 2025)
- **PostgreSQL Database**: Added persistent data storage with Drizzle ORM
- **Enhanced Data Models**: Expanded schema for comprehensive restaurant management
- **Database Storage**: Migrated from in-memory to PostgreSQL for production-ready persistence

### Comprehensive Restaurant Management Platform (June 27, 2025)
- **Operations Dashboard**: Full restaurant analytics with revenue, orders, efficiency metrics
- **Multi-Tab Interface**: Organized dashboard, AI chat, and settings into separate focused areas
- **Advanced Analytics**: Real-time tracking of kitchen efficiency, staff performance, inventory levels
- **Restaurant Operations**: Daily service metrics, cover tracking, peak hour analysis
- **Menu Performance**: Popular item tracking, profit margin analysis, optimization recommendations
- **Staff Management**: Labor cost tracking, performance metrics, scheduling insights
- **Inventory Management**: Stock level monitoring, reorder alerts, waste tracking

### Enhanced AI Chef Capabilities
- **Improved Layout**: Fixed text overflow issues with responsive chat interface
- **Better Formatting**: Enhanced message display with proper bullet points and structured content
- **Context Integration**: Deeper restaurant context awareness for more relevant recommendations
- **Recommendation Tracking**: Interactive recommendation cards with detailed views and implementation tracking

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