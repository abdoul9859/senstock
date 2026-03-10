const GenericPage = ({ title }: { title: string }) => (
  <div>
    <h2 className="mb-6 text-xl font-semibold text-foreground">{title}</h2>
    <div className="rounded-lg border border-border bg-card p-8 text-center animate-fade-in">
      <p className="text-muted-foreground">Cette section sera bientôt disponible</p>
    </div>
  </div>
);

export default GenericPage;
