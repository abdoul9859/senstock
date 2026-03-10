import { Globe, Sparkles, Wand2, Layout, Palette, Rocket } from "lucide-react";

export default function SiteWebPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="h-6 w-6" />
          Site web
        </h1>
        <p className="text-muted-foreground">Generez votre site web de vente en ligne avec l'IA</p>
      </div>

      <div className="flex flex-col items-center justify-center py-16">
        <div className="max-w-lg w-full text-center space-y-8">
          {/* Icon */}
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
            <Wand2 className="h-12 w-12 text-primary" />
          </div>

          {/* Title */}
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-foreground">Bientot disponible</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Notre generateur de site web propulse par l'IA arrive bientot.
              Creez votre boutique en ligne en quelques clics.
            </p>
          </div>

          {/* Features preview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mx-auto">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Generation IA</h3>
              <p className="text-xs text-muted-foreground">Decrivez votre boutique et l'IA cree votre site</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mx-auto">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Personnalisable</h3>
              <p className="text-xs text-muted-foreground">Couleurs, polices, mise en page a votre image</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mx-auto">
                <Rocket className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Publication instant</h3>
              <p className="text-xs text-muted-foreground">Publiez votre site en un clic, domaine inclus</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-muted px-5 py-2.5 text-sm text-muted-foreground">
            <Layout className="h-4 w-4" />
            Fonctionnalite en cours de developpement
          </div>
        </div>
      </div>
    </div>
  );
}
