import "../../src/styles.css";
import "../../src/lib/mini-app/mini-app.css";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@rakazo/ui-web/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@rakazo/ui-web/components/ui/alert";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@rakazo/ui-web/components/ui/avatar";
import { Badge } from "@rakazo/ui-web/components/ui/badge";
import { Button } from "@rakazo/ui-web/components/ui/button";
import { ButtonGroup } from "@rakazo/ui-web/components/ui/button-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@rakazo/ui-web/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@rakazo/ui-web/components/ui/carousel";
import { Checkbox } from "@rakazo/ui-web/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@rakazo/ui-web/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rakazo/ui-web/components/ui/dialog";
import { Input } from "@rakazo/ui-web/components/ui/input";
import { Label } from "@rakazo/ui-web/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@rakazo/ui-web/components/ui/pagination";
import { Progress, ProgressLabel, ProgressValue } from "@rakazo/ui-web/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@rakazo/ui-web/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rakazo/ui-web/components/ui/select";
import { Separator } from "@rakazo/ui-web/components/ui/separator";
import { Skeleton } from "@rakazo/ui-web/components/ui/skeleton";
import { Slider } from "@rakazo/ui-web/components/ui/slider";
import { Spinner } from "@rakazo/ui-web/components/ui/spinner";
import { Switch } from "@rakazo/ui-web/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@rakazo/ui-web/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@rakazo/ui-web/components/ui/tabs";
import { Textarea } from "@rakazo/ui-web/components/ui/textarea";
import { Toggle } from "@rakazo/ui-web/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@rakazo/ui-web/components/ui/toggle-group";
import { AlertCircle, Bold, Italic, Underline } from "lucide-react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";

const scene = new URLSearchParams(location.search).get("scene") ?? "dashboard";

const leads = [
  {
    address: "14 Cedar Lane",
    seller: "M. Rivera",
    ask: "$118,000",
    stage: "New",
    tone: "secondary",
  },
  {
    address: "902 Oak Street",
    seller: "J. Patel",
    ask: "$164,500",
    stage: "Contacted",
    tone: "secondary",
  },
  {
    address: "31 Birch Court",
    seller: "A. Chen",
    ask: "$203,000",
    stage: "Offer out",
    tone: "default",
  },
  {
    address: "7 Pine Road",
    seller: "L. Okafor",
    ask: "$91,000",
    stage: "Dead",
    tone: "destructive",
  },
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{hint}</CardContent>
    </Card>
  );
}

function Dashboard() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Deal room</h1>
          <p className="text-sm text-muted-foreground">31 Birch Court · closing Nov 24</p>
        </div>
        <div className="flex items-center gap-3">
          <AvatarGroup>
            {["AC", "MR", "JP"].map((initials) => (
              <Avatar key={initials} size="lg">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            ))}
            <AvatarGroupCount>+2</AvatarGroupCount>
          </AvatarGroup>
          <Badge>Under contract</Badge>
          <Button variant="outline">Share</Button>
          <Button>Send offer</Button>
        </div>
      </div>

      <Alert>
        <AlertCircle />
        <AlertTitle>Title company needs the signed addendum</AlertTitle>
        <AlertDescription>
          Due Friday. The seller has not opened the e-sign link yet.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Asking price" value="$203,000" hint="Comps suggest $196,500" />
        <Stat label="Max offer" value="$171,400" hint="ARV 70% minus repairs and fee" />
        <Stat label="Assignment fee" value="$14,000" hint="Buyer list: 6 interested" />
      </div>

      <Tabs defaultValue="overview" className="w-fit">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-[1.6fr_1fr] gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline</CardTitle>
            <CardDescription>Leads in this market, newest first</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Address</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead className="text-right">Asking</TableHead>
                  <TableHead>Stage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.address}>
                    <TableCell className="font-medium">{lead.address}</TableCell>
                    <TableCell>{lead.seller}</TableCell>
                    <TableCell className="text-right tabular-nums">{lead.ask}</TableCell>
                    <TableCell>
                      <Badge variant={lead.tone}>{lead.stage}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">1</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#" isActive>
                    2
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">3</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext href="#" />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Offer calculator</CardTitle>
            <CardDescription>Adjust and send as a draft</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <Label>Percent of ARV</Label>
                <span className="text-muted-foreground tabular-nums">70%</span>
              </div>
              <Slider defaultValue={[70]} max={100} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Repairs</Label>
              <Input defaultValue="$18,500" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Financing</Label>
              <Select
                defaultValue="cash"
                items={[
                  { value: "cash", label: "Cash" },
                  { value: "hard", label: "Hard money" },
                ]}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="hard">Hard money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Include closing costs</Label>
              <Switch defaultChecked />
            </div>
            <Progress value={64}>
              <ProgressLabel>Negotiation</ProgressLabel>
              <ProgressValue />
            </Progress>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="ghost">Reset</Button>
            <Button>Draft offer</Button>
          </CardFooter>
        </Card>
      </div>

      <Accordion defaultValue={["notes"]}>
        <AccordionItem value="notes">
          <AccordionTrigger>Seller notes</AccordionTrigger>
          <AccordionContent>
            Motivated by a relocation. Prefers a quick close and is flexible on price if there are
            no repairs asked.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="comps">
          <AccordionTrigger>Comparable sales</AccordionTrigger>
          <AccordionContent>Three sales within half a mile in the last 90 days.</AccordionContent>
        </AccordionItem>
        <AccordionItem value="terms">
          <AccordionTrigger>Contract terms</AccordionTrigger>
          <AccordionContent>Inspection 10 days, earnest money $1,000, assignable.</AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function Components() {
  return (
    <div className="grid grid-cols-2 gap-x-10 gap-y-8">
      <Section title="Buttons">
        <div className="flex flex-wrap gap-2">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </div>
        <ButtonGroup>
          <Button variant="outline">Day</Button>
          <Button variant="outline">Week</Button>
          <Button variant="outline">Month</Button>
        </ButtonGroup>
      </Section>

      <Section title="Badges and avatars">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
        <AvatarGroup>
          {["HA", "AK", "SN", "RK"].map((initials) => (
            <Avatar key={initials} size="lg">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          ))}
          <AvatarGroupCount>+8</AvatarGroupCount>
        </AvatarGroup>
      </Section>

      <Section title="Inputs">
        <Input placeholder="Search leads" />
        <Textarea placeholder="Notes for the next call" />
        <Select
          defaultValue="new"
          items={[
            { value: "new", label: "New" },
            { value: "offer", label: "Offer out" },
          ]}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="offer">Offer out</SelectItem>
          </SelectContent>
        </Select>
      </Section>

      <Section title="Selection">
        <div className="flex items-center gap-2">
          <Checkbox defaultChecked id="c1" />
          <Label htmlFor="c1">Follow up automatically</Label>
        </div>
        <RadioGroup defaultValue="cash">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="cash" id="r1" />
            <Label htmlFor="r1">Cash</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="hard" id="r2" />
            <Label htmlFor="r2">Hard money</Label>
          </div>
        </RadioGroup>
        <div className="flex items-center gap-2">
          <Switch defaultChecked id="s1" />
          <Label htmlFor="s1">Notify me</Label>
        </div>
        <Slider defaultValue={[35]} max={100} />
        <div className="flex gap-2">
          <Toggle aria-label="Bold">
            <Bold />
          </Toggle>
          <ToggleGroup defaultValue={["italic"]} multiple>
            <ToggleGroupItem value="italic" aria-label="Italic">
              <Italic />
            </ToggleGroupItem>
            <ToggleGroupItem value="underline" aria-label="Underline">
              <Underline />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </Section>

      <Section title="Feedback">
        <Alert>
          <AlertCircle />
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>The buyer list was updated an hour ago.</AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Could not send</AlertTitle>
          <AlertDescription>The texting tool is not connected.</AlertDescription>
        </Alert>
        <Progress value={42}>
          <ProgressLabel>Upload</ProgressLabel>
          <ProgressValue />
        </Progress>
        <div className="flex items-center gap-3">
          <Spinner />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="size-8 rounded-full" />
        </div>
      </Section>

      <Section title="Navigation and disclosure">
        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">Account</TabsTrigger>
            <TabsTrigger value="b">Billing</TabsTrigger>
            <TabsTrigger value="c">Team</TabsTrigger>
          </TabsList>
        </Tabs>
        <Pagination className="mx-0 justify-start">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>
                1
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">2</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        <Collapsible defaultOpen>
          <CollapsibleTrigger render={<Button variant="outline" />}>
            Show details
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 text-sm text-muted-foreground">
            Collapsible content sits right under its trigger.
          </CollapsibleContent>
        </Collapsible>
        <Separator />
      </Section>

      <div className="col-span-2">
        <Section title="Carousel">
          <Carousel className="mx-12 max-w-2xl">
            <CarouselContent>
              {["Front", "Kitchen", "Yard", "Garage"].map((name) => (
                <CarouselItem key={name} className="basis-1/3">
                  <Card>
                    <CardContent className="grid aspect-video place-items-center text-sm text-muted-foreground">
                      {name}
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </Section>
      </div>
    </div>
  );
}

function DialogScene() {
  return (
    <>
      <div className="opacity-60">
        <Dashboard />
      </div>
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send this offer?</DialogTitle>
            <DialogDescription>
              A text with the drafted offer goes to M. Rivera once you confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Textarea defaultValue="Hi M., we can close in 14 days at $118,000 cash, no repairs needed." />
            <div className="flex items-center gap-2">
              <Checkbox defaultChecked id="d1" />
              <Label htmlFor="d1">Log it in the CRM</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline">Cancel</Button>
            <Button>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Gallery() {
  return (
    <div className="mini-app min-h-screen bg-background p-8 text-foreground">
      {scene === "components" ? (
        <Components />
      ) : scene === "dialog" ? (
        <DialogScene />
      ) : (
        <Dashboard />
      )}
    </div>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Gallery />);
