import Image from "next/image"
import Link from "next/link"
import { ChevronRight, Clock, ImageIcon, MapPin, Mountain, User, Users } from "lucide-react"
import { Avatar, Rating } from "./Avatar"
import { Badge, StatusBadge } from "./Badge"
import { cx, formatDuration, formatPrice } from "./utils"

type MediaProps = {
  src?: string | null
  alt: string
  ratio?: string
  blurDataURL?: string | null
  sizes?: string
  placeholder?: "image" | "mountain"
  className?: string
  priority?: boolean
  children?: React.ReactNode
}

/** Foto com proporção fixa, cantos radius-lg e placeholder de traço. */
export function Media({ src, alt, ratio = "4 / 3", blurDataURL, sizes, placeholder = "image", className, priority, children }: MediaProps) {
  const Ph = placeholder === "mountain" ? Mountain : ImageIcon
  return (
    <div className={cx("capi-media", className)} style={{ aspectRatio: ratio }}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes ?? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"}
          placeholder={blurDataURL ? "blur" : "empty"}
          blurDataURL={blurDataURL ?? undefined}
          priority={priority}
          style={{ objectFit: "cover" }}
        />
      ) : (
        <div className="capi-media__ph" aria-hidden="true">
          <Ph size={32} strokeWidth={1.25} />
        </div>
      )}
      {children}
    </div>
  )
}

export type DestinationCardProps = {
  title: string
  href: string
  state?: string | null
  imageUrl?: string | null
  imageBlurDataUrl?: string | null
  packageCount?: number
  guideCount?: number
  ratio?: string
  headingLevel?: "h2" | "h3"
  priority?: boolean
}

/** Card de destino guiado pela foto (4:5), nome em Playfair sobre degradê. */
export function DestinationCard({ title, href, state, imageUrl, imageBlurDataUrl, packageCount, guideCount, ratio = "4 / 5", headingLevel: H = "h3", priority }: DestinationCardProps) {
  const meta = [
    packageCount != null ? `${packageCount} ${packageCount === 1 ? "roteiro" : "roteiros"}` : null,
    guideCount != null ? `${guideCount} ${guideCount === 1 ? "guia" : "guias"}` : null,
  ].filter(Boolean).join(" · ")
  return (
    <Link href={href} className="capi-dest">
      <Media src={imageUrl} alt={title} ratio={ratio} blurDataURL={imageBlurDataUrl} placeholder="mountain" className="capi-dest__media" priority={priority} sizes="(max-width: 640px) 80vw, (max-width: 1024px) 45vw, 25vw">
        <div className="capi-dest__overlay">
          {state ? (
            <span className="capi-dest__state">
              <MapPin size={14} strokeWidth={2} aria-hidden="true" />
              {state}
            </span>
          ) : null}
          <H className="capi-dest__title">{title}</H>
          {meta ? <span className="capi-dest__meta">{meta}</span> : null}
        </div>
      </Media>
    </Link>
  )
}

export type PackageCardData = {
  name: string
  durationMinutes: number
  priceFrom: number
  difficulty?: "EASY" | "MODERATE" | "HARD" | null
  coverImageUrl?: string | null
  coverImageBlurDataUrl?: string | null
  groupSize?: number | null
  rating?: number | null
  reviewCount?: number | null
  guideName?: string | null
  tags?: string[]
}

/** Card de roteiro: foto 4:3, dificuldade, nome, nota, duração, grupo e preço por pessoa. */
export function PackageCard({ package: p, href }: { package: PackageCardData; href: string }) {
  return (
    <Link href={href} className="capi-pkg">
      <Media src={p.coverImageUrl} alt={p.name} blurDataURL={p.coverImageBlurDataUrl} className="capi-pkg__media">
        {p.difficulty ? (
          <span className="capi-pkg__chip">
            <StatusBadge kind="difficulty" status={p.difficulty} />
          </span>
        ) : null}
      </Media>
      <div className="capi-pkg__body">
        <div className="capi-pkg__row">
          <h3 className="capi-pkg__title">{p.name}</h3>
          {p.rating !== undefined ? <Rating value={p.rating} count={p.reviewCount} size={14} /> : null}
        </div>
        <p className="capi-pkg__meta">
          {p.durationMinutes > 0 ? <span><Clock size={14} strokeWidth={1.75} aria-hidden="true" />{formatDuration(p.durationMinutes)}</span> : null}
          {p.groupSize ? <span><Users size={14} strokeWidth={1.75} aria-hidden="true" />até {p.groupSize}</span> : null}
          {p.guideName ? <span><User size={14} strokeWidth={1.75} aria-hidden="true" />{p.guideName}</span> : null}
        </p>
        {p.tags && p.tags.length > 0 ? (
          <p className="capi-pkg__meta">{p.tags.slice(0, 3).join(" · ")}</p>
        ) : null}
        <p className="capi-pkg__price">
          <span className="capi-pkg__from">a partir de </span>
          <strong>{formatPrice(p.priceFrom)}</strong>
          <span className="capi-pkg__unit"> /pessoa</span>
        </p>
      </div>
    </Link>
  )
}

export type GuideCardData = {
  name: string
  photoUrl?: string | null
  verified?: boolean
  rating?: number | null
  reviewCount?: number | null
  languages?: string[]
  specialties: string[]
  packageCount: number
  yearsActive?: number | null
}

/** Card horizontal de guia: avatar, nome, nota, idiomas, até 3 especialidades. */
export function GuideCard({ guide: g, href }: { guide: GuideCardData; href: string }) {
  return (
    <Link href={href} className="capi-guide">
      <Avatar name={g.name} src={g.photoUrl} size={64} verified={g.verified} />
      <div className="capi-guide__body">
        <div className="capi-guide__top">
          <h3 className="capi-guide__name">{g.name}</h3>
          <Rating value={g.rating ?? null} count={g.reviewCount} size={14} />
        </div>
        {g.languages && g.languages.length > 0 ? <p className="capi-guide__meta">{g.languages.join(" · ")}</p> : null}
        {g.specialties.length > 0 ? (
          <div className="capi-guide__tags">
            {g.specialties.slice(0, 3).map((s) => <Badge key={s}>{s}</Badge>)}
          </div>
        ) : null}
        <p className="capi-guide__foot">
          {g.packageCount} {g.packageCount === 1 ? "roteiro" : "roteiros"}
          {g.yearsActive ? ` · ${g.yearsActive} anos guiando` : ""}
        </p>
      </div>
      <ChevronRight size={20} strokeWidth={1.75} className="capi-guide__chev" aria-hidden="true" />
    </Link>
  )
}
