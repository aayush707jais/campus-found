import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { ReactNode } from "react";

interface FeatureModalProps {
  title: string;
  children: ReactNode;
  trigger: ReactNode;
}

export function FeatureModal({ title, children, trigger }: FeatureModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Detailed instructions for {title}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 pt-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface StepProps {
  number: number;
  title: string;
  description: string;
  details?: string[];
}

export function Step({ number, title, description, details }: StepProps) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold shadow-lg">
        {number}
      </div>
      <div className="flex-1 space-y-2">
        <h4 className="font-semibold text-lg">{title}</h4>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
        {details && details.length > 0 && (
          <ul className="space-y-1 mt-2">
            {details.map((detail, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
