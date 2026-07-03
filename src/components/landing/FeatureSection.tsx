import { type LucideIcon } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface FeatureSectionProps {
  id: string;
  badge: string;
  title: string;
  titleHighlight: string;
  subtitle: string;
  features: FeatureItem[];
  image?: string;
  imageAlt?: string;
  direction?: "left" | "right";
  glowClass?: string;
}

const FeatureCard = ({
  feature,
  index,
  glowClass,
}: {
  feature: FeatureItem;
  index: number;
  glowClass: string;
}) => {
  const { ref, isRevealed } = useScrollReveal(0.1);
  const Icon = feature.icon;

  return (
    <div
      ref={ref}
      className={`scroll-reveal reveal-up stagger-${index + 1} ${
        isRevealed ? "revealed" : ""
      }`}
    >
      <div className={`card-3d glass-panel rounded-2xl p-6 h-full ${glowClass}`}>
        <div className="w-12 h-12 rounded-xl bg-gradient-cosmic flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <h4 className="font-display font-semibold text-foreground mb-2">
          {feature.title}
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {feature.description}
        </p>
      </div>
    </div>
  );
};

const FeatureSection = ({
  id,
  badge,
  title,
  titleHighlight,
  subtitle,
  features,
  image,
  imageAlt,
  direction = "left",
  glowClass = "section-glow-primary",
}: FeatureSectionProps) => {
  const { ref: sectionRef, isRevealed: sectionRevealed } = useScrollReveal(0.1);
  const { ref: imageRef, isRevealed: imageRevealed } = useScrollReveal(0.2);

  const imageBlock = image ? (
    <div
      ref={imageRef}
      className={`scroll-reveal ${
        direction === "left" ? "reveal-left" : "reveal-right"
      } ${imageRevealed ? "revealed" : ""}`}
    >
      <div className="perspective-container">
        <div className="card-3d rounded-2xl overflow-hidden border border-border/30 shadow-2xl">
          <img
            src={image}
            alt={imageAlt || title}
            className="w-full h-auto object-cover"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  ) : null;

  const textBlock = (
    <div className="space-y-6">
      {/* Section header */}
      <div
        ref={sectionRef}
        className={`scroll-reveal reveal-up ${sectionRevealed ? "revealed" : ""}`}
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
          {badge}
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground leading-tight">
          {title}{" "}
          <span className="text-gradient">{titleHighlight}</span>
        </h2>
        <p className="text-muted-foreground text-lg mt-4 max-w-xl leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 perspective-container">
        {features.map((feature, i) => (
          <FeatureCard
            key={feature.title}
            feature={feature}
            index={i}
            glowClass={glowClass}
          />
        ))}
      </div>
    </div>
  );

  return (
    <section id={id} className={`py-20 sm:py-28 relative ${glowClass}`}>
      <div className="max-w-7xl mx-auto px-6">
        {image ? (
          <div
            className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center ${
              direction === "right" ? "lg:grid-flow-dense" : ""
            }`}
          >
            {direction === "left" ? (
              <>
                {imageBlock}
                {textBlock}
              </>
            ) : (
              <>
                <div className={direction === "right" ? "lg:col-start-2" : ""}>
                  {imageBlock}
                </div>
                <div className={direction === "right" ? "lg:col-start-1" : ""}>
                  {textBlock}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            {textBlock}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeatureSection;
