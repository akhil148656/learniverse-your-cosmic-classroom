import { useState } from "react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpacePetAvatar } from "@/components/student/SpacePetAvatar";
import { useSpacePet, ACCESSORY_SHOP, BACKDROP_SHOP } from "@/hooks/useSpacePet";
import { Sparkles, Trophy, Award, Lock, Check, Gift, Smile, Heart, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function StudentStudyBuddy() {
  const {
    coins,
    selectedPet,
    petName,
    unlockedAccessories,
    equippedAccessories,
    selectedBackdrop,
    unlockedBackdrops,
    petMood,
    petEnergy,
    isLoading,
    renamePet,
    changePetType,
    buyAccessory,
    equipAccessory,
    unequipAccessory,
    buyBackdrop,
    selectBackdrop
  } = useSpacePet();

  const [nameInput, setNameInput] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // Playdesk action wiggles
  const [playActionText, setPlayActionText] = useState("");
  const [actionCooldown, setActionCooldown] = useState(false);

  const handleAction = (type: "feed" | "pet" | "train") => {
    if (actionCooldown) return;
    setActionCooldown(true);
    
    if (type === "feed") {
      setPlayActionText("Feeding Cosmo delicious stardust biscuits... 🍪");
      toast.success(`${petName} chomped the stardust biscuit! Energy restored!`);
    } else if (type === "pet") {
      setPlayActionText(`Petting ${petName}... Soft space fur/chassis purring! ❤️`);
      toast.success(`${petName} is extremely happy and wiggles with joy!`);
    } else {
      setPlayActionText(`Simulating low-gravity space walk maneuvers... ☄️`);
      toast.success(`${petName} performed a double barrel roll in mid-air!`);
    }

    setTimeout(() => {
      setPlayActionText("");
      setActionCooldown(false);
    }, 2500);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    renamePet(nameInput);
    setIsRenaming(false);
    setNameInput("");
  };

  const activeBackdrop = BACKDROP_SHOP.find(b => b.id === selectedBackdrop) || BACKDROP_SHOP[0];

  return (
    <PortalLayout role="student">
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Galactic Study Buddy</h1>
            <p className="text-muted-foreground">Interact with your customization pet and spend Cosmic Coins earned from learning</p>
          </div>
          
          {/* Coins Badge */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-yellow-500/15 border border-amber-500/30 rounded-full px-5 py-2.5 shadow-[0_0_20px_rgba(245,158,11,0.15)] animate-pulse">
            <span className="text-xl">🪙</span>
            <div className="text-left leading-none">
              <p className="font-display font-extrabold text-lg text-amber-400">{coins}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-mono">Cosmic Coins</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">
            Loading cockpit capsule parameters...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
            
            {/* LEFT SIDE: Visual Playdesk */}
            <div className="space-y-6">
              <Card className={cn(
                "relative h-[400px] flex flex-col justify-between overflow-hidden border border-border transition-all duration-500",
                activeBackdrop.colorClass
              )}>
                {/* Space Stars overlays */}
                <div className="absolute inset-0 bg-[url('/starfield.png')] bg-cover opacity-20" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/20 to-slate-950 pointer-events-none" />

                {/* Top status header */}
                <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-0 bg-slate-950/40 backdrop-blur-md border-b border-border/20 py-3">
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        {isRenaming ? (
                          <form onSubmit={handleRenameSubmit} className="flex gap-2">
                            <Input
                              value={nameInput}
                              onChange={(e) => setNameInput(e.target.value)}
                              placeholder="New name..."
                              className="h-8 text-xs bg-muted border-border max-w-[120px]"
                              autoFocus
                            />
                            <Button type="submit" size="sm" className="h-8 px-2 text-xs bg-primary hover:bg-primary/90">
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setIsRenaming(false)}>
                              Cancel
                            </Button>
                          </form>
                        ) : (
                          <>
                            <h3 className="font-display font-bold text-lg text-foreground">{petName}</h3>
                            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-primary" onClick={() => { setNameInput(petName); setIsRenaming(true); }}>
                              Rename
                            </Button>
                          </>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                        Species: {
                          selectedPet === "spacedog" ? "Space Puppy" :
                          selectedPet === "droid" ? "Study Bot" :
                          selectedPet === "starry" ? "Alien Slime" :
                          selectedPet === "spacecat" ? "Space Cat" :
                          selectedPet === "astroparrot" ? "Astro Parrot" :
                          selectedPet === "shinchan" ? "Shinchan Cadet" :
                          "Space Companion"
                        }
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 bg-background/50 border border-border/80 rounded-full font-mono uppercase tracking-wider text-muted-foreground">
                    State: {petMood === "happy" ? "😊 Happy" : petMood === "studying" ? "⚡ Studying" : "😴 Tired"}
                  </span>
                </CardHeader>

                {/* Center Space Capsule Display */}
                <div className="relative flex-1 flex flex-col items-center justify-center p-6">
                  {/* Floating Action Text Balloon */}
                  {playActionText && (
                    <div className="absolute top-4 bg-background/90 border border-secondary/35 text-secondary px-4 py-2 rounded-xl text-xs font-medium max-w-[280px] text-center shadow-lg animate-bounce z-30">
                      {playActionText}
                    </div>
                  )}

                  {/* Centered Pet */}
                  <SpacePetAvatar
                    petType={selectedPet}
                    equipped={equippedAccessories}
                    mood={petMood}
                    energy={petEnergy}
                    size="lg"
                    className="relative z-10"
                  />
                  
                  {/* Hologram deck platform glow */}
                  <div className="w-44 h-4 bg-secondary/15 rounded-full filter blur-md -mt-2 animate-pulse z-0" />
                  <div className="w-32 h-1 bg-cyan-400/30 rounded-full -mt-2 z-0" />
                </div>

                {/* Bottom playdesk actions */}
                <div className="relative z-10 p-4 bg-slate-950/60 backdrop-blur-md border-t border-border/20 flex justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs gap-1.5 border-border hover:border-secondary hover:text-secondary font-display uppercase tracking-wider"
                    onClick={() => handleAction("feed")}
                    disabled={actionCooldown}
                  >
                    <Gift className="w-3.5 h-3.5" />
                    Feed Treat
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs gap-1.5 border-border hover:border-secondary hover:text-secondary font-display uppercase tracking-wider"
                    onClick={() => handleAction("pet")}
                    disabled={actionCooldown}
                  >
                    <Smile className="w-3.5 h-3.5" />
                    Pet
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs gap-1.5 border-border hover:border-secondary hover:text-secondary font-display uppercase tracking-wider"
                    onClick={() => handleAction("train")}
                    disabled={actionCooldown}
                  >
                    <Play className="w-3.5 h-3.5" />
                    Space Walk
                  </Button>
                </div>
              </Card>
            </div>

            {/* RIGHT SIDE: Cosmic Customizer Shop Tabs */}
            <div className="space-y-6">
              <Card className="bg-card border-border shadow-[0_0_20px_rgba(139,92,246,0.1)] flex flex-col h-[400px]">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="font-display text-base flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-secondary" />
                    Cosmic Customizer Shop
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">Unlock new species skins, backdrops, and active accessories</CardDescription>
                </CardHeader>

                <Tabs defaultValue="accessories" className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-4 py-2 border-b border-border/20 bg-muted/20">
                    <TabsList className="grid grid-cols-3 bg-muted border border-border h-9">
                      <TabsTrigger value="accessories" className="text-xs font-display">Accessories</TabsTrigger>
                      <TabsTrigger value="backdrops" className="text-xs font-display">Backdrops</TabsTrigger>
                      <TabsTrigger value="species" className="text-xs font-display">Species</TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Accessories Tab */}
                  <TabsContent value="accessories" className="flex-1 overflow-y-auto p-4 m-0 space-y-3">
                    {ACCESSORY_SHOP.map((item) => {
                      const isUnlocked = unlockedAccessories.includes(item.id);
                      const isEquipped = equippedAccessories.includes(item.id);

                      return (
                        <div key={item.id} className="flex justify-between items-center p-3 rounded-xl bg-muted/40 border border-border hover:border-primary/20 transition-all duration-300">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{item.emoji}</span>
                            <div>
                              <p className="font-semibold text-foreground text-sm leading-none">{item.name}</p>
                              <p className="text-[11px] text-muted-foreground mt-1">{item.description}</p>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isEquipped ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs border-secondary/40 text-secondary bg-secondary/5"
                                onClick={() => unequipAccessory(item.id)}
                              >
                                Unequip
                              </Button>
                            ) : isUnlocked ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs border-primary/40 text-primary hover:bg-primary/10"
                                onClick={() => equipAccessory(item.id)}
                              >
                                Equip
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="h-8 text-xs bg-primary hover:bg-primary/95 text-white gap-1"
                                onClick={() => buyAccessory(item)}
                              >
                                🪙 {item.cost}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </TabsContent>

                  {/* Backdrops Tab */}
                  <TabsContent value="backdrops" className="flex-1 overflow-y-auto p-4 m-0 space-y-3">
                    {BACKDROP_SHOP.map((item) => {
                      const isUnlocked = unlockedBackdrops.includes(item.id);
                      const isActive = selectedBackdrop === item.id;

                      return (
                        <div key={item.id} className="flex justify-between items-center p-3 rounded-xl bg-muted/40 border border-border hover:border-primary/20 transition-all duration-300">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-10 h-10 rounded border border-border", item.colorClass)} />
                            <div>
                              <p className="font-semibold text-foreground text-sm leading-none">{item.name}</p>
                              <p className="text-[11px] text-muted-foreground mt-1">{item.description}</p>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isActive ? (
                              <Button
                                size="sm"
                                disabled
                                className="h-8 text-xs bg-secondary/15 text-secondary border border-secondary/35"
                              >
                                Active
                              </Button>
                            ) : isUnlocked ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs border-border hover:border-primary/50 text-foreground"
                                onClick={() => selectBackdrop(item.id)}
                              >
                                Set Backdrop
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="h-8 text-xs bg-primary hover:bg-primary/95 text-white gap-1"
                                onClick={() => buyBackdrop(item)}
                              >
                                🪙 {item.cost}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </TabsContent>

                  {/* Species Tab */}
                  <TabsContent value="species" className="flex-1 overflow-y-auto p-4 m-0 space-y-3">
                    {/* Puppy Option */}
                    <div className="flex justify-between items-center p-3 rounded-xl bg-muted/40 border border-border hover:border-primary/20 transition-all duration-300">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">🐶</span>
                        <div>
                          <p className="font-semibold text-foreground text-sm leading-none">Space Puppy (Cosmo)</p>
                          <p className="text-[11px] text-muted-foreground mt-1">A cute floppy-eared canine companion</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={selectedPet === "spacedog" ? "default" : "outline"}
                        className={cn("h-8 text-xs", selectedPet === "spacedog" && "bg-secondary text-background hover:bg-secondary/90")}
                        onClick={() => changePetType("spacedog")}
                        disabled={selectedPet === "spacedog"}
                      >
                        {selectedPet === "spacedog" ? "Active" : "Activate"}
                      </Button>
                    </div>

                    {/* Cat Option */}
                    <div className="flex justify-between items-center p-3 rounded-xl bg-muted/40 border border-border hover:border-primary/20 transition-all duration-300">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">🐱</span>
                        <div>
                          <p className="font-semibold text-foreground text-sm leading-none">Space Cat (Luna)</p>
                          <p className="text-[11px] text-muted-foreground mt-1">A graceful feline explorer of the galaxy</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={selectedPet === "spacecat" ? "default" : "outline"}
                        className={cn("h-8 text-xs", selectedPet === "spacecat" && "bg-secondary text-background hover:bg-secondary/90")}
                        onClick={() => changePetType("spacecat")}
                        disabled={selectedPet === "spacecat"}
                      >
                        {selectedPet === "spacecat" ? "Active" : "Activate"}
                      </Button>
                    </div>

                    {/* Parrot Option */}
                    <div className="flex justify-between items-center p-3 rounded-xl bg-muted/40 border border-border hover:border-primary/20 transition-all duration-300">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">🦜</span>
                        <div>
                          <p className="font-semibold text-foreground text-sm leading-none">Astro Parrot (Quacker)</p>
                          <p className="text-[11px] text-muted-foreground mt-1">A colorfully chirping cosmic avian cadet</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={selectedPet === "astroparrot" ? "default" : "outline"}
                        className={cn("h-8 text-xs", selectedPet === "astroparrot" && "bg-secondary text-background hover:bg-secondary/90")}
                        onClick={() => changePetType("astroparrot")}
                        disabled={selectedPet === "astroparrot"}
                      >
                        {selectedPet === "astroparrot" ? "Active" : "Activate"}
                      </Button>
                    </div>

                    {/* Shinchan Option */}
                    <div className="flex justify-between items-center p-3 rounded-xl bg-muted/40 border border-border hover:border-primary/20 transition-all duration-300">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">👦</span>
                        <div>
                          <p className="font-semibold text-foreground text-sm leading-none">Shinchan Cadet</p>
                          <p className="text-[11px] text-muted-foreground mt-1">A fun, mischievous astronaut boy companion</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={selectedPet === "shinchan" ? "default" : "outline"}
                        className={cn("h-8 text-xs", selectedPet === "shinchan" && "bg-secondary text-background hover:bg-secondary/90")}
                        onClick={() => changePetType("shinchan")}
                        disabled={selectedPet === "shinchan"}
                      >
                        {selectedPet === "shinchan" ? "Active" : "Activate"}
                      </Button>
                    </div>

                    {/* Robot Option */}
                    <div className="flex justify-between items-center p-3 rounded-xl bg-muted/40 border border-border hover:border-primary/20 transition-all duration-300">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">🤖</span>
                        <div>
                          <p className="font-semibold text-foreground text-sm leading-none">Study Bot (D-8)</p>
                          <p className="text-[11px] text-muted-foreground mt-1">Metallic mechanical helper with wobbly gears</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={selectedPet === "droid" ? "default" : "outline"}
                        className={cn("h-8 text-xs", selectedPet === "droid" && "bg-secondary text-background hover:bg-secondary/90")}
                        onClick={() => changePetType("droid")}
                        disabled={selectedPet === "droid"}
                      >
                        {selectedPet === "droid" ? "Active" : "Activate"}
                      </Button>
                    </div>

                    {/* Alien Option */}
                    <div className="flex justify-between items-center p-3 rounded-xl bg-muted/40 border border-border hover:border-primary/20 transition-all duration-300">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">👽</span>
                        <div>
                          <p className="font-semibold text-foreground text-sm leading-none">Alien Slime (Starry)</p>
                          <p className="text-[11px] text-muted-foreground mt-1">Glowing floaty cadet born from nebula dust</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={selectedPet === "starry" ? "default" : "outline"}
                        className={cn("h-8 text-xs", selectedPet === "starry" && "bg-secondary text-background hover:bg-secondary/90")}
                        onClick={() => changePetType("starry")}
                        disabled={selectedPet === "starry"}
                      >
                        {selectedPet === "starry" ? "Active" : "Activate"}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
            
          </div>
        )}

      </div>
    </PortalLayout>
  );
}
