declare module '*.jsx' {
  const content: any;
  export default content;
}

declare module './components/ui/button' {
  export const Button: any;
}

declare module './components/ui/avatar' {
  export const Avatar: any;
  export const AvatarImage: any;
  export const AvatarFallback: any;
}

declare module './components/ui/badge' {
  export const Badge: any;
}

declare module './components/ui/tabs' {
  export const Tabs: any;
  export const TabsList: any;
  export const TabsTrigger: any;
  export const TabsContent: any;
}

declare module './components/ui/dialog' {
  export const Dialog: any;
  export const DialogContent: any;
  export const DialogTitle: any;
  export const DialogDescription: any;
  export const VisuallyHidden: any;
}

declare module './components/ui/toast' {
  export const useToast: any;
  export const ToastProvider: any;
}

declare module './components/MembershipDashboard' {
  const MembershipDashboard: any;
  export default MembershipDashboard;
}

declare module './components/MembershipPlans' {
  const MembershipPlans: any;
  export default MembershipPlans;
}

declare module './components/PaymentGateway' {
  const PaymentGateway: any;
  export default PaymentGateway;
}

declare module './components/PaymentSuccess' {
  const PaymentSuccess: any;
  export default PaymentSuccess;
}

declare module './components/LoginModal' {
  const LoginModal: any;
  export default LoginModal;
}

declare module './components/UserProfile' {
  const UserProfile: any;
  export default UserProfile;
}

declare module './components/ChatRoomList' {
  const ChatRoomList: any;
  export default ChatRoomList;
}

declare module './components/RealTimeChat' {
  const RealTimeChat: any;
  export default RealTimeChat;
}

declare module './components/CreatePrivateRoomModal' {
  const CreatePrivateRoomModal: any;
  export default CreatePrivateRoomModal;
}

declare module './components/AIMatchingSystem' {
  const AIMatchingSystem: any;
  export default AIMatchingSystem;
}

declare module './components/PrivateChatList' {
  const PrivateChatList: any;
  export default PrivateChatList;
}

declare module './components/PrivateChat' {
  const PrivateChat: any;
  export default PrivateChat;
}

declare module './components/NewPrivateChatModal' {
  const NewPrivateChatModal: any;
  export default NewPrivateChatModal;
}

declare module './components/AdminDashboard' {
  const AdminDashboard: any;
  export default AdminDashboard;
}

declare module './components/HealthCheck' {
  const HealthCheck: any;
  export default HealthCheck;
}

declare module './components/JoinChatRoom' {
  const JoinChatRoom: any;
  export default JoinChatRoom;
}

declare module './contexts/AuthContext' {
  export const useAuth: any;
  export const AuthProvider: any;
}

declare module './services/membershipAPI' {
  export const membershipAPI: any;
}
