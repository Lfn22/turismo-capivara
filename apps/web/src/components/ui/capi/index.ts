/**
 * CAPI design system v2 — componentes React.
 * Estilos em src/styles/capi.css (importado por app/globals.css). Só tokens; nada de hex nas telas.
 * Referência visual e regras de uso: artefato "CAPI" (design system).
 */
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from "./Button"
export { IconButton, type IconButtonProps } from "./IconButton"
export { Input, Select, Textarea, type InputProps, type SelectProps, type TextareaProps } from "./Input"
export { Chip, type ChipProps } from "./Chip"
export { Badge, StatusBadge, type BadgeProps, type StatusBadgeProps, type Tone } from "./Badge"
export { Avatar, Rating, type AvatarProps, type RatingProps } from "./Avatar"
export { Media, DestinationCard, PackageCard, GuideCard, type DestinationCardProps, type PackageCardData, type GuideCardData } from "./Cards"
export { StatCard, ListRow, ListGroup, EmptyState, Alert, Skeleton, PageHeader } from "./Feedback"
export { Modal, type ModalProps } from "./Modal"
export { Tabs, Stepper, BottomNav, TopNav, SidebarLinks, type NavItem, type TabItem } from "./Navigation"
export { SlotPicker, BookingSummary, BookingBar, type SlotDay, type SlotTime } from "./Booking"
export { cx, formatPrice, formatDuration, formatRating } from "./utils"
