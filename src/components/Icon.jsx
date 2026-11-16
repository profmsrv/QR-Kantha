import React from "react";
import {
  ArrowLeft, Check, ChevronRight, CircleCheck, CirclePlus, CircleStop, ClipboardPaste, Copy,
  Download, ExternalLink, Eye, EyeOff, House, History, Images, Lightbulb, Minus, PanelLeftClose,
  PanelLeftOpen, Plus, QrCode, RefreshCw, ScanQrCode, Settings, Share2, Smartphone, Split,
  SwitchCamera, Trash2, Undo2, X, Zap, ZapOff,
} from "lucide-react";

// The app asks for icons by a short name. This table says which Lucide icon each name means.
// To use a different icon, change it here and nowhere else.
const ICONS = {
  arrow_back: ArrowLeft,
  add: Plus,
  add_circle: CirclePlus,
  call_split: Split,
  cameraswitch: SwitchCamera,
  check: Check,
  check_circle: CircleCheck,
  chevron_right: ChevronRight,
  close: X,
  content_copy: Copy,
  content_paste: ClipboardPaste,
  delete: Trash2,
  download: Download,
  flash_off: ZapOff,
  flash_on: Zap,
  history: History,
  home: House,
  left_panel_close: PanelLeftClose,
  left_panel_open: PanelLeftOpen,
  lightbulb: Lightbulb,
  open_in_new: ExternalLink,
  photo_library: Images,
  qr_code_2: QrCode,
  qr_code_scanner: ScanQrCode,
  refresh: RefreshCw,
  remove: Minus,
  settings: Settings,
  share: Share2,
  smartphone: Smartphone,
  stop_circle: CircleStop,
  undo: Undo2,
  visibility: Eye,
  visibility_off: EyeOff,
};

// `fill` = "selected" look: a bolder stroke (Lucide icons are outlines).
const Icon = ({ name, fill = false, size = 24, className = "", style }) => {
  const Glyph = ICONS[name];
  if (!Glyph) return null;
  return <Glyph aria-hidden="true" size={size} strokeWidth={fill ? 2.5 : 2} className={`shrink-0 ${className}`} style={style} />;
};

export default Icon;
