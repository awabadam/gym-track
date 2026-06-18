import { createProgram } from "@/app/actions/programs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewProgramPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New program</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Program details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createProgram} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Upper/Lower 4 Day Split"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                placeholder="Optional description..."
              />
            </div>
            <div>
              <Label htmlFor="targetRir">Target RIR</Label>
              <select
                id="targetRir"
                name="targetRir"
                defaultValue="2"
                className="mt-1 flex h-8 w-full border-2 border-foreground bg-transparent px-2.5 text-sm"
              >
                {[0, 1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "rep" : "reps"} in reserve
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Reps left in the tank before the app suggests adding weight.
              </p>
            </div>
            <Button type="submit">Create &amp; add days</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
