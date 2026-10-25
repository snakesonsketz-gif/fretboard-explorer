import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INSTRUMENTS, TUNINGS } from "@/lib/tuner/tunings";
import { cn } from "@/lib/utils";

const GROUPS = INSTRUMENTS.filter((i) => i.id !== "other").map((i) => ({ i, list: TUNINGS.filter((t) => t.instrument === i.id) }));
const pretty = (notes: string) => notes.replace(/\d/g, "").replace(/#/g, "♯").replace(/(?<=[A-G])b/g, "♭");

/** Every tuning from the tuner, grouped by instrument (guitar, 7- and 8-string, bass, ukulele). */
export function TuningSelect({ value, onChange, placeholder, className, testId }: { value: string; onChange: (id: string) => void; placeholder?: string; className?: string; testId?: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("h-9 w-[15.5rem]", className)} aria-label="Tuning" data-testid={testId}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-96">
        {GROUPS.map(({ i, list }) => (
          <SelectGroup key={i.id}>
            <SelectLabel>{i.name}</SelectLabel>
            {list.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name} <span className="text-muted-foreground">· {pretty(t.notes)}</span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
