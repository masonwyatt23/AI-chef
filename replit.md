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

### Streamlined AI Output Generation for Optimal User Experience (June 30, 2025)
- **Concise AI Prompts**: Redesigned AI prompts to generate brief, high-quality cocktail descriptions instead of verbose outputs
- **Focused Content**: Cocktail descriptions limited to 1-2 sentences while maintaining professional quality and uniqueness
- **Efficient Generation**: Streamlined all generation tiers (AI, dynamic, fallback) for consistent, concise outputs
- **Maintained Uniqueness**: Preserved timestamp-based unique generation system while reducing verbosity
- **User-Optimized Interface**: Enhanced readability and usability of generated cocktails in the UI
- **Restaurant Context Integration**: Continues to incorporate restaurant profile data but presents it more efficiently

### Complete Restaurant Profile Integration for AI Generation (June 30, 2025)
- **Full Context AI Enhancement**: Menu and cocktail generation now uses complete restaurant profile (all 50+ data points)
- **Comprehensive Business Intelligence**: AI receives establishment type, service style, target demographics, location, kitchen capabilities, and all other profile details
- **Strategic Business Recommendations**: AI generates items specifically tailored to restaurant's market positioning, competition, and business goals
- **Type-Safe Context Building**: Implemented helper function to properly handle database null values and ensure type safety
- **Enhanced Relevance**: AI now considers local ingredients, cultural influences, staff skills, equipment limitations, and seasonal factors
- **Business-Specific Generation**: All generated content aligns with profit margins, food cost goals, and operational capabilities

### Complete Batch Production System Integration (July 2, 2025)
- **Enhanced AI Batch Production**: AI prompts now generate comprehensive batch production instructions for 10-100 servings
- **Scaled Ingredient Calculations**: Automatic scaling from individual portions to commercial batch sizes with proper unit conversions
- **Volume Production Techniques**: AI generates batch-specific cooking methods, timing adjustments, and yield calculations
- **Commercial Kitchen Focus**: Batch instructions tailored for restaurant volume production with cost efficiency analysis
- **Integrated Frontend Controls**: Batch production toggle and size selection (10, 20, 50, 100 servings) in generation interface
- **TypeScript Interface Updates**: Added batchServes, batchInstructions, batchYield, and batchAmount fields to all generation types

### Cocktail Generation User Input Integration Fix (July 8, 2025)
- **Fixed Theme Integration**: Cocktail generator now properly uses user-provided theme/concept to create themed cocktails
- **Base Spirit Preferences**: AI now honors user-selected base spirits (whiskey, gin, vodka, rum, etc.) in cocktail creation
- **Complexity Level Support**: Fixed complexity level implementation - Simple (3-4 ingredients), Moderate (5-6 ingredients), Advanced (7+ ingredients with complex techniques)
- **Seasonality Integration**: Seasonal preferences are now incorporated into cocktail flavor profiles and ingredients
- **Enhanced AI Prompts**: Updated AI instructions to prioritize user preferences over default restaurant context
- **Debugging Improvements**: Added logging to track user input usage in cocktail generation process
- **Complexity Enforcement**: Added specific complexity requirements to AI prompts with detailed ingredient count and technique guidelines for each complexity level

### Account Registration System Fix (July 2, 2025)
- **Automatic Restaurant Creation**: New user accounts now automatically receive a default restaurant profile during registration
- **Complete Restaurant Profile**: Default restaurants include all 50+ data points required for AI generation functionality
- **Seamless Onboarding**: New users can immediately access AI Chef Assistant without setup barriers
- **Customizable Defaults**: Default restaurant profiles provide sensible starting values that users can modify as needed
- **Fixed Registration Flow**: Eliminated "No Restaurant Found" error that was blocking new account creation

### Enhanced AI Creativity and Innovation Engine (June 29, 2025)
- **Revolutionary AI Prompts**: Completely redesigned AI system prompts to generate unique, creative, and memorable recipes
- **Anti-Repetition Technology**: Implemented frequency/presence penalties and higher temperature settings to eliminate generic outputs
- **Michelin-Starred AI Chef**: Enhanced AI persona to world-renowned mixologist and Michelin-starred chef with 25+ years experience
- **Innovation Mandates**: Added specific creativity requirements including molecular gastronomy, fusion techniques, Instagram-worthy presentations
- **Originality Focus**: AI now explicitly avoids standard restaurant fare and creates viral-worthy, conversation-starting dishes
- **Advanced Mixology**: Cocktail generation includes fat-washing, clarification, smoking, spherification, and artisanal techniques
- **Social Media Ready**: All generated items designed to be photogenic and shareable experiences

### Multi-User Authentication System Implementation (June 29, 2025)
- **User Authentication**: Implemented secure session-based authentication with bcrypt password hashing
- **Single Restaurant Focus**: System streamlined to single account (depot_owner) with direct access to The Depot Grille (ID: 70)
- **Database Cleanup**: Removed duplicate restaurant entries, keeping only the main restaurant with complete data
- **Protected Routes**: All restaurant data and AI interactions are user-specific and protected by authentication
- **Direct Access**: Auto-redirect depot_owner to main restaurant, bypassing selection dashboard
- **Seamless User Experience**: One-click login takes user directly to their restaurant AI system

### Enhanced AI Chef Assistant with Advanced Menu Intelligence (June 27, 2025)
- **Comprehensive Restaurant Profiling**: Enhanced detailed restaurant profile display showing all 50+ captured data points organized by categories
- **Advanced Menu Parsing & Analysis**: Smart menu parsing that extracts categories and items from pasted text menus
- **Category-Specific AI Generation**: Engineered AI prompts for targeted menu item creation based on specific food categories
- **Expert-Level AI Responses**: Sophisticated prompt engineering providing restaurant-quality culinary recommendations
- **Enhanced Database Integration**: PostgreSQL persistence with comprehensive restaurant context saving and retrieval

### Core Features
- **Intelligent Menu Analysis**: Parse existing menus to understand current offerings and generate strategic improvements
- **Category-Focused Generation**: Target specific menu categories (appetizers, entrees, desserts, etc.) with expert-level AI prompts
- **Advanced Restaurant Context Display**: Beautiful, organized display of all restaurant profile data including business goals, market position, and operational details
- **Strategic Menu Development**: AI-powered recommendations that analyze existing items and create complementary offerings
- **Expert Culinary Guidance**: Category-specific prompts that provide professional-level menu development advice
- **Export Functionality**: Complete recipe and cost data export for implementation

### Technical Architecture
- **Enhanced AI Prompt Engineering**: Category-specific guidance systems providing restaurant-quality recommendations
- **Smart Menu Parsing**: Intelligent text analysis to extract menu structure and items
- **Comprehensive Data Display**: Organized presentation of extensive restaurant profile information
- **Strategic AI Positioning**: Menu generation that analyzes existing offerings and creates strategic additions
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