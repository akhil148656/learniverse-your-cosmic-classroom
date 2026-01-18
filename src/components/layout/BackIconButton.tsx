import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type BackIconButtonProps = {
  fallbackHref: string;
  className?: string;
  title?: string;
};

export function BackIconButton({ fallbackHref, className, title = "Back" }: BackIconButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    // If the user opened this page directly (no in-app history), fall back to a safe route.
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallbackHref);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleBack}
      title={title}
      aria-label={title}
      className={className}
    >
      <ArrowLeft className="w-5 h-5" />
    </Button>
  );
}
