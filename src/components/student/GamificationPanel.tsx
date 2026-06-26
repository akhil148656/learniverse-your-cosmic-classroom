import { useState } from "react";
import { useGamification, CELESTIAL_AVATARS, Avatar, Badge } from "@/hooks/useGamification";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, Trophy, Award, Lock, Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function GamificationPanel() {
  const {
    xp,
    level,
    progressPercent,
    rankName,
    streak,
    selectedAvatar,
    unlockedAvatars,
    badges,
    equipAvatar,
  } = useGamification();

  const [isOpen, setIsOpen] = useState(false);

  const currentAvatar = CELESTIAL_AVATARS.find((a) => a.id === selectedAvatar) || CELESTIAL_AVATARS[0];

  return (
    <>
      <Card className="relative overflow-hidden bg-gradient-to-br from-card via-card to-muted/80 border-primary/20 shadow-[0_0_25px_rgba(139,92,246,0.12)] transition-all duration-300 hover:shadow-[0_0_35px_rgba(20,250,220,0.18)] hover:border-secondary/40">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-bl-full blur-2xl pointer-events-none" />
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* Avatar & Rank */}
            <div className="flex items-center gap-4">
              <div className={cn(
                "relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br text-3xl shadow-[0_0_15px_rgba(139,92,246,0.3)] border-2 border-secondary/30",
                currentAvatar.color
              )}>
                <span className="animate-float">{currentAvatar.emoji}</span>
                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-background border border-secondary text-xs font-bold text-secondary">
                  L{level}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-lg tracking-wide text-foreground">
                    {currentAvatar.name}
                  </span>
                  <Sparkles className="w-4 h-4 text-secondary animate-pulse" />
                </div>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                  Level {level} ({rankName}) • {xp} Total XP
                </p>
              </div>
            </div>

            {/* Level Progress */}
            <div className="flex-1 max-w-md space-y-2">
              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                <span>XP {xp % 250} / 250</span>
                <span>Next Level</span>
              </div>
              <div className="relative h-2.5 w-full bg-muted rounded-full overflow-hidden border border-border/50">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-primary via-purple-500 to-secondary transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Streak & Academy Button */}
            <div className="flex items-center justify-between md:justify-end gap-6">
              
              {/* Daily Streak */}
              <div className="flex items-center gap-2 bg-secondary/5 border border-secondary/15 rounded-full px-4 py-2 shadow-[0_0_15px_rgba(20,250,220,0.05)]">
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 animate-ping rounded-full bg-orange-500/25 blur-sm w-5 h-5" />
                  <Flame className="w-5 h-5 text-orange-500 fill-orange-500/20" />
                </div>
                <div className="text-left leading-none">
                  <p className="font-display font-extrabold text-sm text-foreground">{streak} Day</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Streak</p>
                </div>
              </div>

              {/* Academy Modal Trigger */}
              <Button 
                onClick={() => setIsOpen(true)}
                className="bg-primary hover:bg-primary/90 text-white font-display text-xs uppercase tracking-widest border border-primary/20 glow-primary transition-all duration-300 hover:scale-[1.02]"
              >
                <Award className="w-4 h-4 mr-2" />
                Celestial Academy
              </Button>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Celestial Academy Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl bg-card border-border shadow-[0_0_40px_rgba(139,92,246,0.25)] text-foreground">
          <DialogHeader className="border-b border-border/50 pb-4">
            <DialogTitle className="font-display text-2xl font-bold flex items-center gap-3">
              <Trophy className="w-6 h-6 text-secondary animate-pulse" />
              <span>Celestial Academy</span>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="avatars" className="w-full mt-4">
            <TabsList className="grid grid-cols-2 bg-muted border border-border max-w-sm mx-auto mb-6">
              <TabsTrigger value="avatars" className="font-display text-sm">Celestial Avatars</TabsTrigger>
              <TabsTrigger value="badges" className="font-display text-sm">Knowledge Badges</TabsTrigger>
            </TabsList>

            {/* Avatars Tab */}
            <TabsContent value="avatars" className="space-y-4">
              <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground">
                  Advance your level to unlock prestigious celestial avatars. Equip one to represent your cosmic identity.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-1">
                {CELESTIAL_AVATARS.map((av) => {
                  const isUnlocked = unlockedAvatars.includes(av.id);
                  const isEquipped = selectedAvatar === av.id;

                  return (
                    <Card 
                      key={av.id} 
                      className={cn(
                        "relative bg-muted/30 border transition-all duration-300",
                        isEquipped ? "border-secondary bg-secondary/5 shadow-[0_0_15px_rgba(20,250,220,0.15)]" : "border-border hover:border-primary/50"
                      )}
                    >
                      <CardContent className="p-4 flex flex-col items-center text-center space-y-3">
                        <div className={cn(
                          "w-16 h-16 rounded-full bg-gradient-to-br flex items-center justify-center text-3xl shadow-md",
                          av.color,
                          !isUnlocked && "grayscale opacity-40"
                        )}>
                          <span>{av.emoji}</span>
                        </div>
                        <div>
                          <h4 className="font-display font-semibold text-sm flex items-center justify-center gap-1.5">
                            {av.name}
                            {!isUnlocked && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 h-8 flex items-center justify-center">
                            {av.description}
                          </p>
                        </div>

                        <div className="w-full pt-2">
                          {isEquipped ? (
                            <Button disabled className="w-full bg-secondary/20 text-secondary border border-secondary/35 text-xs h-9">
                              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Equipped
                            </Button>
                          ) : isUnlocked ? (
                            <Button 
                              onClick={() => equipAvatar(av.id)} 
                              variant="outline" 
                              className="w-full hover:border-secondary hover:text-secondary text-xs h-9 transition-colors"
                            >
                              Equip
                            </Button>
                          ) : (
                            <Button disabled variant="secondary" className="w-full text-xs h-9 text-muted-foreground bg-muted/50">
                              Lvl {av.minLevel} Required
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Badges Tab */}
            <TabsContent value="badges" className="space-y-4">
              <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground">
                  Earn unique academic badges by solving quizzes, using labs, and maintaining daily study streaks.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1">
                {badges.map((badge) => (
                  <Card 
                    key={badge.id} 
                    className={cn(
                      "bg-muted/30 border transition-all duration-300",
                      badge.isUnlocked ? "border-primary/30 bg-primary/5" : "border-border/50 opacity-60"
                    )}
                  >
                    <CardContent className="p-4 flex gap-4 items-center">
                      <div className={cn(
                        "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-inner",
                        badge.isUnlocked ? "bg-gradient-to-br from-primary/20 to-secondary/20 text-foreground border border-secondary/30" : "bg-muted border border-border"
                      )}>
                        {badge.isUnlocked ? badge.icon : <Lock className="w-5 h-5 text-muted-foreground" />}
                      </div>
                      <div className="space-y-1 text-left flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-display font-semibold text-sm truncate">{badge.name}</h4>
                          {badge.isUnlocked && (
                            <span className="text-[10px] bg-secondary/15 text-secondary px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                              Unlocked
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{badge.description}</p>
                        <p className="text-[10px] text-muted-foreground italic truncate">Req: {badge.requirement}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
