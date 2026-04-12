import { useEffect, useState } from "react";
import {
  Bell,
  BookOpenText,
  ChevronRight,
  ChevronsUpDown,
  ClipboardList,
  Compass,
  FileText,
  Filter,
  LayoutDashboard,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  WandSparkles
} from "lucide-react";
import { toast } from "sonner";
import { apiRoutes, type BriefResponse, type DemoResponse, type HealthResponse } from "@synosec/contracts";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./components/ui/accordion";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./components/ui/collapsible";
import { Combobox } from "./components/ui/combobox";
import { Input } from "./components/ui/input";
import {
  Menubar,
  MenubarMenu,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger
} from "./components/ui/menubar";
import { Popover, PopoverContent, PopoverTrigger } from "./components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuText,
  SidebarProvider,
  SidebarTrigger
} from "./components/ui/sidebar";
import { Skeleton } from "./components/ui/skeleton";
import { Spinner } from "./components/ui/spinner";
import { Switch } from "./components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "./components/ui/table";
import { Textarea } from "./components/ui/textarea";
import { Toaster } from "./components/ui/toaster";
import { Toggle } from "./components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "./components/ui/toggle-group";
import { Display, Eyebrow, Lead, SectionTitle } from "./components/ui/typography";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";

type LoadableState<T> =
  | { state: "loading" }
  | { state: "loaded"; data: T }
  | { state: "error"; message: string };

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

function MetricsSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
    </div>
  );
}

function severityVariant(severity: DemoResponse["findings"][number]["severity"]) {
  if (severity === "high") {
    return "destructive";
  }
  if (severity === "medium") {
    return "warning";
  }
  return "success";
}

export default function App() {
  const [health, setHealth] = useState<LoadableState<HealthResponse>>({ state: "loading" });
  const [demo, setDemo] = useState<LoadableState<DemoResponse>>({ state: "loading" });
  const [brief, setBrief] = useState<LoadableState<BriefResponse>>({ state: "loading" });
  const [scanPreset, setScanPreset] = useState("depth-first");
  const [environment, setEnvironment] = useState("sandbox");
  const [operatorMode, setOperatorMode] = useState("assist");
  const [autopilot, setAutopilot] = useState(true);
  const [compactRows, setCompactRows] = useState(false);
  const [notifyOnBrief, setNotifyOnBrief] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [healthData, demoData, briefData] = await Promise.all([
          fetchJson<HealthResponse>(apiRoutes.health),
          fetchJson<DemoResponse>(apiRoutes.demo),
          fetchJson<BriefResponse>(apiRoutes.brief)
        ]);

        if (!active) {
          return;
        }

        setHealth({ state: "loaded", data: healthData });
        setDemo({ state: "loaded", data: demoData });
        setBrief({ state: "loaded", data: briefData });
      } catch (error) {
        if (!active) {
          return;
        }

        const message = error instanceof Error ? error.message : "Unknown error";
        setHealth({ state: "error", message });
        setDemo({ state: "error", message });
        setBrief({ state: "error", message });
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  async function fetchBrief() {
    setBrief({ state: "loading" });

    try {
      const briefData = await fetchJson<BriefResponse>(apiRoutes.brief);
      setBrief({ state: "loaded", data: briefData });
      if (notifyOnBrief) {
        toast.success("Backend brief refreshed", {
          description: briefData.headline
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setBrief({ state: "error", message });
      toast.error("Brief request failed", {
        description: message
      });
    }
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="min-h-screen xl:flex">
          <Sidebar>
            <SidebarHeader>
              <div className="space-y-1">
                <Eyebrow>SynoSec</Eyebrow>
                <p className="text-lg font-semibold">Operator Console</p>
              </div>
              <SidebarTrigger />
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Surfaces</SidebarGroupLabel>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <LayoutDashboard className="h-4 w-4 text-primary" />
                    <SidebarMenuText>Mission dashboard</SidebarMenuText>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <ScanSearch className="h-4 w-4 text-primary" />
                    <SidebarMenuText>Scan orchestration</SidebarMenuText>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <ClipboardList className="h-4 w-4 text-primary" />
                    <SidebarMenuText>Findings registry</SidebarMenuText>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel>Intel</SidebarGroupLabel>
                <Card className="border-primary/15 bg-primary/5">
                  <CardContent className="space-y-3 p-4">
                    <Badge variant="success">Live backend link</Badge>
                    <p className="text-sm text-muted-foreground">
                      Runtime-validated contracts keep the dashboard and API in sync while the team moves fast.
                    </p>
                  </CardContent>
                </Card>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          <main className="flex-1">
            <div className="container py-6 md:py-8">
              <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="space-y-3">
                  <Eyebrow>Tailwind + shadcn refresh</Eyebrow>
                  <Display>Security scanning control plane with a full component baseline.</Display>
                  <Lead>
                    The frontend now uses Tailwind utilities and a local shadcn-style component set spanning navigation, forms, overlays, data display, feedback, and typography.
                  </Lead>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Menubar>
                    <MenubarMenu>
                      <MenubarTrigger>Views</MenubarTrigger>
                      <MenubarContent>
                        <MenubarItem>Operator overview</MenubarItem>
                        <MenubarItem>Queue explorer</MenubarItem>
                        <MenubarSub>
                          <MenubarSubTrigger>Export</MenubarSubTrigger>
                          <MenubarSubContent>
                            <MenubarItem>CSV manifest</MenubarItem>
                            <MenubarItem>Incident snapshot</MenubarItem>
                          </MenubarSubContent>
                        </MenubarSub>
                      </MenubarContent>
                    </MenubarMenu>
                    <MenubarMenu>
                      <MenubarTrigger>Preferences</MenubarTrigger>
                      <MenubarContent>
                        <MenubarCheckboxItem checked={notifyOnBrief} onCheckedChange={(checked) => setNotifyOnBrief(Boolean(checked))}>
                          Toast on brief refresh
                        </MenubarCheckboxItem>
                        <MenubarCheckboxItem checked={compactRows} onCheckedChange={(checked) => setCompactRows(Boolean(checked))}>
                          Compact finding rows
                        </MenubarCheckboxItem>
                        <MenubarSeparator />
                        <MenubarRadioGroup value={operatorMode} onValueChange={setOperatorMode}>
                          <MenubarRadioItem value="assist">Assist mode</MenubarRadioItem>
                          <MenubarRadioItem value="contain">Contain mode</MenubarRadioItem>
                          <MenubarRadioItem value="observe">Observe mode</MenubarRadioItem>
                        </MenubarRadioGroup>
                      </MenubarContent>
                    </MenubarMenu>
                  </Menubar>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline">
                        <BookOpenText className="h-4 w-4" />
                        Release notes
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">Frontend migration</p>
                        <p className="text-sm text-muted-foreground">
                          Tailwind powers layout and theming. The UI layer now covers table, inputs, selection, overlay, feedback, and navigation primitives.
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="default" onClick={() => void fetchBrief()}>
                        <Sparkles className="h-4 w-4" />
                        Fetch backend brief
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Trigger a fresh `/api/brief` request.</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
                <section className="space-y-6">
                  <Card className="overflow-hidden border-none bg-gradient-to-br from-primary/10 via-card to-secondary/60">
                    <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge>Typed contracts</Badge>
                          {health.state === "loaded" && <Badge variant="success">Status: {health.data.status}</Badge>}
                          {demo.state === "loaded" && <Badge variant="outline">Targets queued: {demo.data.targetCount}</Badge>}
                        </div>
                        <SectionTitle>Mission-ready frontend baseline</SectionTitle>
                        <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                          This screen is intentionally broad: it demonstrates the requested component inventory while still rendering real health, finding, and brief data from the existing Express API.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Toggle aria-label="Toggle operator focus" variant="outline">
                            <WandSparkles className="mr-2 h-4 w-4" />
                            Human-in-loop
                          </Toggle>
                          <ToggleGroup type="single" value={scanPreset} onValueChange={(value) => value && setScanPreset(value)} variant="outline">
                            <ToggleGroupItem value="depth-first">Depth-first</ToggleGroupItem>
                            <ToggleGroupItem value="breadth-first">Breadth-first</ToggleGroupItem>
                            <ToggleGroupItem value="burst">Burst</ToggleGroupItem>
                          </ToggleGroup>
                        </div>
                      </div>

                      <Card className="border-border/60 bg-background/80">
                        <CardHeader className="pb-3">
                          <CardTitle>Controls</CardTitle>
                          <CardDescription>Forms, selects, combobox, switch, textarea and tooltips.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <label className="text-sm font-medium" htmlFor="mission-name">
                                Mission name
                              </label>
                              <Input id="mission-name" defaultValue="April buildathon validation" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Priority profile</label>
                              <Select value={scanPreset} onValueChange={setScanPreset}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a profile" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="depth-first">Depth-first</SelectItem>
                                  <SelectItem value="breadth-first">Breadth-first</SelectItem>
                                  <SelectItem value="burst">Burst validation</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Environment target</label>
                            <Combobox
                              value={environment}
                              onValueChange={setEnvironment}
                              options={[
                                { value: "sandbox", label: "Sandbox cluster" },
                                { value: "staging", label: "Staging tenant" },
                                { value: "production", label: "Production mirror" }
                              ]}
                            />
                          </div>

                          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                            <div className="space-y-2">
                              <label className="text-sm font-medium" htmlFor="operator-note">
                                Operator note
                              </label>
                              <Textarea
                                id="operator-note"
                                defaultValue="Focus payload review on ingress paths before handing off to the backend orchestration lane."
                              />
                            </div>
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/40 p-4 md:flex-col md:items-start">
                              <div>
                                <p className="text-sm font-medium">Autopilot hints</p>
                                <p className="text-xs text-muted-foreground">Suggest next actions from findings.</p>
                              </div>
                              <Switch checked={autopilot} onCheckedChange={setAutopilot} aria-label="Toggle autopilot hints" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </CardContent>
                  </Card>

                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <SectionTitle>Findings table</SectionTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Filter className="h-4 w-4" />
                        Filtered by <span className="font-medium text-foreground">{environment}</span>
                      </div>
                    </div>

                    {demo.state === "loading" ? (
                      <MetricsSkeleton />
                    ) : demo.state === "error" ? (
                      <Card>
                        <CardContent className="p-6 text-sm text-destructive">{demo.message}</CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Finding</TableHead>
                                <TableHead>Severity</TableHead>
                                <TableHead>Target</TableHead>
                                <TableHead>Summary</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {demo.data.findings.map((finding) => (
                                <TableRow key={finding.id} className={compactRows ? "[&>td]:py-2" : undefined}>
                                  <TableCell className="font-medium">{finding.id}</TableCell>
                                  <TableCell>
                                    <Badge variant={severityVariant(finding.severity)}>{finding.severity}</Badge>
                                  </TableCell>
                                  <TableCell className="font-mono text-xs md:text-sm">{finding.target}</TableCell>
                                  <TableCell>{finding.summary}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    )}
                  </section>
                </section>

                <section className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        Live service snapshot
                      </CardTitle>
                      <CardDescription>Card, badge, spinner, skeleton, and typography primitives over API data.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {health.state === "loading" ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Spinner />
                          Loading health status...
                        </div>
                      ) : health.state === "error" ? (
                        <p className="text-sm text-destructive">{health.message}</p>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Service</p>
                              <p className="text-sm text-muted-foreground">{health.data.service}</p>
                            </div>
                            <Badge variant="success">{health.data.status}</Badge>
                          </div>
                          <div className="rounded-xl border border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
                            Updated {new Date(health.data.timestamp).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Briefing lane</CardTitle>
                      <CardDescription>Accordion, collapsible, and toast-backed refresh actions.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Accordion type="single" collapsible defaultValue="brief">
                        <AccordionItem value="brief">
                          <AccordionTrigger>Operator brief</AccordionTrigger>
                          <AccordionContent>
                            {brief.state === "loading" ? (
                              <div className="space-y-3">
                                <Skeleton className="h-4 w-2/3" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                              </div>
                            ) : brief.state === "error" ? (
                              <p className="text-sm text-destructive">{brief.message}</p>
                            ) : (
                              <div className="space-y-3">
                                <p className="font-medium">{brief.data.headline}</p>
                                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                  Generated {new Date(brief.data.generatedAt).toLocaleString()}
                                </p>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                  {brief.data.actions.map((action) => (
                                    <li key={action} className="flex items-start gap-2">
                                      <ChevronRight className="mt-0.5 h-4 w-4 text-primary" />
                                      <span>{action}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="contract">
                          <AccordionTrigger>Contract notes</AccordionTrigger>
                          <AccordionContent>
                            The dashboard still reads from the existing `/api/health`, `/api/demo`, and `/api/brief` routes, so the UI migration does not change backend behavior.
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>

                      <Collapsible defaultOpen>
                        <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Stack inventory</p>
                              <p className="text-sm text-muted-foreground">
                                Menubar, popover, tooltip, sidebar, toggle group, and table are all active on this page.
                              </p>
                            </div>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <ChevronsUpDown className="mr-2 h-4 w-4" />
                                Details
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                          <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
                            <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Compass className="h-4 w-4 text-primary" />
                                Tailwind utility layout and theme tokens.
                              </div>
                              <div className="flex items-center gap-2">
                                <Bell className="h-4 w-4 text-primary" />
                                Sonner toast feedback on manual brief refresh.
                              </div>
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary" />
                                Typed API data rendered in cards and table rows.
                              </div>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    </CardContent>
                  </Card>
                </section>
              </div>
            </div>
          </main>
          <Toaster />
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
