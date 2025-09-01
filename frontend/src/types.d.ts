// Global type declarations for JSX components
declare module '*.jsx' {
  import React from 'react'
  const Component: React.ComponentType<any>
  export default Component
}

declare module '*.js' {
  const content: any
  export default content
}

// Declare missing properties on PublicUser type
declare global {
  interface PublicUser {
    username?: string
    isVerified?: boolean
    isOnline?: boolean
  }
}

// Event target type augmentation
interface EventTarget {
  src?: string
}

// Generic component type for any UI component
type AnyComponent = React.ComponentType<any>

// UI Component type declarations - using any to bypass strict typing
declare module './components/ui/button' {
  export const Button: AnyComponent
}

declare module './components/ui/avatar' {
  export const Avatar: AnyComponent
  export const AvatarImage: AnyComponent
  export const AvatarFallback: AnyComponent
}

declare module './components/ui/tabs' {
  export const Tabs: AnyComponent
  export const TabsList: AnyComponent
  export const TabsTrigger: AnyComponent
  export const TabsContent: AnyComponent
}

declare module './components/ui/dialog' {
  export const Dialog: AnyComponent
  export const DialogContent: AnyComponent
  export const DialogTitle: AnyComponent
  export const DialogDescription: AnyComponent
  export const VisuallyHidden: AnyComponent
}

declare module './components/ui/toast' {
  export const ToastProvider: AnyComponent
  export const useToast: () => { ToastContainer: AnyComponent }
}

// Component type declarations
declare module './components/MembershipDashboard' {
  const Component: AnyComponent
  export default Component
}

declare module './components/MembershipPlans' {
  const Component: AnyComponent
  export default Component
}

declare module './components/PaymentGateway' {
  const Component: AnyComponent
  export default Component
}

declare module './components/PaymentSuccess' {
  const Component: AnyComponent
  export default Component
}

declare module './components/LoginModal' {
  const Component: AnyComponent
  export default Component
}

declare module './components/UserProfile' {
  const Component: AnyComponent
  export default Component
}

declare module './components/ChatRoomList' {
  const Component: AnyComponent
  export default Component
}

declare module './components/RealTimeChat' {
  const Component: AnyComponent
  export default Component
}

declare module './components/CreatePrivateRoomModal' {
  const Component: AnyComponent
  export default Component
}

declare module './components/AIMatchingSystem' {
  const Component: AnyComponent
  export default Component
}

declare module './contexts/AuthContext' {
  export const AuthProvider: AnyComponent
  export const useAuth: () => any
}

declare module './services/membershipAPI' {
  const content: any
  export default content
}

export {}
