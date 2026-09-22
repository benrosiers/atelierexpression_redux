import releasePayload from '../data/tresh-release.json';

export interface TreshSiteLink {
  id: string;
  label: string;
  href: string;
}

export interface TreshResponsiveHeight {
  desktop: number;
  tablet: number;
  mobile: number;
}

export interface TreshSiteBranding {
  title: string;
  description: string;
  faviconUrl?: string;
}

export interface TreshSiteNavigation {
  visible: boolean;
  brandText: string;
  logoUrl?: string;
  links: TreshSiteLink[];
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  sticky: boolean;
  transparent: boolean;
  blur: number;
  shadow: boolean;
  height: TreshResponsiveHeight;
}

export interface TreshSiteFooter {
  visible: boolean;
  brandText: string;
  body: string;
  links: TreshSiteLink[];
  socialLinks: TreshSiteLink[];
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  height: TreshResponsiveHeight;
}

export interface TreshGlobalChrome {
  branding: TreshSiteBranding | undefined;
  navigation: TreshSiteNavigation | undefined;
  footer: TreshSiteFooter | undefined;
}

export interface TreshPlacement {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent?: number;
  rotationDegrees: number;
  zIndex: number;
  opacity: number;
  fontSize?: number;
  parallaxDepth?: number;
  imageFit?: 'cover' | 'contain' | 'fill';
  imageFocalX?: number;
  imageFocalY?: number;
}

export interface TreshResponsivePlacement {
  desktop: TreshPlacement;
  tablet?: Partial<TreshPlacement>;
  mobile?: Partial<TreshPlacement>;
}

export interface TreshElementShadow {
  enabled: boolean;
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
  opacity: number;
}

export interface TreshElementGlow {
  enabled: boolean;
  color: string;
  blur: number;
  intensity: number;
}

export interface TreshElementEffects {
  shadow?: TreshElementShadow;
  glow?: TreshElementGlow;
}

interface TreshSceneElementBase {
  id: string;
  sectionId: string;
  placement: TreshResponsivePlacement;
  visible: boolean;
  locked: boolean;
  effects?: TreshElementEffects;
}

export type TreshTextFontFamily =
  | 'serif'
  | 'sans'
  | 'mono'
  | 'system';

export type TreshTextFontWeight =
  | 300
  | 400
  | 500
  | 600
  | 700
  | 800
  | 900;

export interface TreshTextTypography {
  color: string;
  fontFamily: TreshTextFontFamily;
  fontWeight: TreshTextFontWeight;
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  letterSpacing: number;
  textTransform:
    | 'none'
    | 'uppercase'
    | 'lowercase'
    | 'capitalize';
}

export interface TreshTextElement extends TreshSceneElementBase {
  type: 'text';
  text: Record<string, string>;
  variant: 'eyebrow' | 'heading' | 'body';
  typography?: Partial<TreshTextTypography>;
}

export interface TreshImageElement extends TreshSceneElementBase {
  type: 'image';
  source:
    | { kind: 'placeholder'; label: string }
    | { kind: 'url'; url: string }
    | { kind: 'media'; mediaAssetId: string };
  altText: Record<string, string>;
  cornerRadius: number;
  aspectRatio?: number;
  fit?: 'cover' | 'contain' | 'fill';
}

export interface TreshPaintElement extends TreshSceneElementBase {
  type: 'paint';
  assetKey: 'coral' | 'rose' | 'peach';
  customColor?: string;
  decorative: true;
}

export type TreshButtonVariant = 'primary' | 'secondary' | 'text';

export interface TreshButtonStyle {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  fontFamily: TreshTextFontFamily;
  fontSize: number;
  fontWeight: TreshTextFontWeight;
  hoverBackgroundColor: string;
  hoverTextColor: string;
  hoverBorderColor: string;
}

export interface TreshButtonElement extends TreshSceneElementBase {
  type: 'button';
  label: Record<string, string>;
  href: string;
  variant: TreshButtonVariant;
  style?: Partial<TreshButtonStyle>;
  openInNewTab?: boolean;
}

export interface TreshShapeElement extends TreshSceneElementBase {
  type: 'shape';
  shapeKind:
    | 'rectangle'
    | 'square'
    | 'circle'
    | 'ellipse'
    | 'triangle'
    | 'diamond'
    | 'star'
    | 'line';
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  cornerRadius: number;
}

export type TreshSceneElement =
  | TreshTextElement
  | TreshImageElement
  | TreshPaintElement
  | TreshButtonElement
  | TreshShapeElement;

export interface TreshSectionDocument {
  id: string;
  type: string;
  label: string;
  visible: boolean;
  height: TreshResponsiveHeight;
  props: Record<string, unknown>;
  scene: TreshSceneElement[];
}

export interface TreshPageDocument {
  id: string;
  slug: string;
  title?: string;
  description?: string;
  locale: string;
  sections: TreshSectionDocument[];
}

export interface TreshSiteDocument {
  schemaVersion?: number;
  siteKit?: string;
  siteKitVersion?: string;
  branding?: TreshSiteBranding;
  navigation?: TreshSiteNavigation;
  footer?: TreshSiteFooter;
  pages: TreshPageDocument[];
}

interface TreshReleasePage {
  id: string;
  slug: string;
  title: string;
  revisionId: string;
  revisionNumber: number;
  schemaVersion: number;
  document: unknown;
  createdAt: string;
}

interface TreshReleasePayload {
  releaseId: string;
  status: string;
  createdAt: string;
  site: {
    id: string;
    slug: string;
    name: string;
    publicUrl: string | null;
  };
  pages: TreshReleasePage[];
}

const release = releasePayload as TreshReleasePayload;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTreshSiteDocument(value: unknown): value is TreshSiteDocument {
  if (!isRecord(value) || !Array.isArray(value.pages)) return false;

  return value.pages.every((candidate) => {
    if (!isRecord(candidate)) return false;
    return (
      typeof candidate.id === 'string' &&
      typeof candidate.slug === 'string' &&
      typeof candidate.locale === 'string' &&
      Array.isArray(candidate.sections)
    );
  });
}

export function getTreshRelease(): TreshReleasePayload {
  return release;
}

// Legacy outer release-page lookup. The current Atelier Expression release
// stores one full SiteDocument inside the immutable outer "home" page.
export function getTreshPage(slug = 'home'): TreshReleasePage | null {
  return release.pages.find((candidate) => candidate.slug === slug) ?? null;
}

export function getTreshSiteDocument(): TreshSiteDocument | null {
  for (const page of release.pages) {
    if (isTreshSiteDocument(page.document)) return page.document;
  }

  return null;
}

export function getTreshDocumentPage(
  slug = 'home',
): TreshPageDocument | null {
  const document = getTreshSiteDocument();
  if (!document) return null;

  return document.pages.find((candidate) => candidate.slug === slug) ?? null;
}

export function getTreshGlobalChrome(): TreshGlobalChrome | null {
  const document = getTreshSiteDocument();

  if (document) {
    if (!document.branding && !document.navigation && !document.footer) {
      return null;
    }

    return {
      branding: document.branding,
      navigation: document.navigation,
      footer: document.footer,
    };
  }

  // Backward compatibility for an older release whose outer page document
  // directly contained global chrome without an inner pages[] collection.
  const page = getTreshPage('home') ?? release.pages[0];

  if (!page || !isRecord(page.document)) return null;

  const legacy = page.document as {
    branding?: TreshSiteBranding;
    navigation?: TreshSiteNavigation;
    footer?: TreshSiteFooter;
  };

  if (!legacy.branding && !legacy.navigation && !legacy.footer) return null;

  return {
    branding: legacy.branding,
    navigation: legacy.navigation,
    footer: legacy.footer,
  };
}
