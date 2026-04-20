import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, BarChart3, Loader2, FileCheck2, Printer } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

type TriageStatRow = {
  barangay_name: string | null;
  triage_level: string;
  count: number;
};

export function Reports() {
  const [data, setData] = useState<TriageStatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");

  useEffect(() => {
    (async () => {
      // Manual aggregation since Supabase RPC/Views aren't fully scripted here
      // We pull the minimal footprint we need and roll it up.
      const [ppResp, trRes] = await Promise.all([
        supabase.from("patient_profiles").select("user_id, barangay_name"),
        supabase.from("ai_triage_results").select("assessment_id, triage_level, created_at, symptom_assessments(user_id)")
      ]);
      
      const pps = ppResp.data || [];
      const trs = trRes.data || [];

      const bgMap = new Map((pps).map(p => [p.user_id, p.barangay_name]));
      
      const aggregated = new Map<string, number>();

      trs.forEach((t: any) => {
        const uId = t.symptom_assessments?.user_id;
        const bg = (uId ? bgMap.get(uId) : null) || "Unassigned";
        const lvl = t.triage_level || "unknown";
        const key = `${bg}::${lvl}`;
        aggregated.set(key, (aggregated.get(key) || 0) + 1);
      });

      const rows: TriageStatRow[] = Array.from(aggregated.entries()).map(([k, count]) => {
        const [bg, lvl] = k.split("::");
        return { barangay_name: bg, triage_level: lvl, count };
      });
      rows.sort((a,b) => (a.barangay_name || "").localeCompare(b.barangay_name || "") || a.triage_level.localeCompare(b.triage_level));

      setData(rows);
      setLoading(false);
    })();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const filteredData = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return data.filter((d) => {
      const matchesSearch = q.length === 0 || (d.barangay_name ?? "").toLowerCase().includes(q);
      const matchesLevel = levelFilter === "all" || d.triage_level === levelFilter;
      return matchesSearch && matchesLevel;
    });
  }, [data, searchTerm, levelFilter]);

  const handleExportCSV = () => {
    if (filteredData.length === 0) return;
    const header = "Barangay Name,Triage Level,Total Cases\n";
    const body = filteredData.map(d => `"${d.barangay_name}","${d.triage_level}",${d.count}`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Barangay_Triage_Stats_${format(new Date(), "MMM_dd_yyyy")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading reports…
        </div>
      </AdminLayout>
    );
  }

  const grandTotal = filteredData.reduce((acc, val) => acc + val.count, 0);

  return (
    <AdminLayout>
      {/* Hide controls from print */}
      <div className="space-y-6 print:!block">
        <div className="print:hidden">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold tracking-tight">System Reports</h1>
              <p className="text-muted-foreground mt-2">Generate, print, and export system analytics</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                Print PDF
              </Button>
              <Button size="sm" className="gap-2 rounded-xl bg-primary text-primary-foreground" onClick={handleExportCSV}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Print-only Header */}
        <div className="hidden print:block mb-8 text-center pb-6 border-b-2">
          <h1 className="text-2xl font-bold">Barangay Triage Analytics Report</h1>
          <p className="text-gray-500">Generated on {format(new Date(), "MMMM d, yyyy")}</p>
        </div>

        <Card className="print:border-none print:shadow-none">
          <CardHeader className="print:hidden">
            <CardTitle>Barangay Health Risk Map</CardTitle>
            <CardDescription>Consolidated statistics spanning all recorded triage occurrences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 print:hidden">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search barangay..."
              />
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter triage level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="non_urgent">Non-urgent</SelectItem>
                  <SelectItem value="home_care">Home care</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {filteredData.length === 0 ? (
              <p className="text-muted-foreground text-sm py-12 text-center">No reports generated yet</p>
            ) : (
              <div className="border rounded-md overflow-hidden bg-background">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left font-bold p-3 border-b">Barangay Name</th>
                      <th className="text-left font-bold p-3 border-b">Triage Level</th>
                      <th className="text-right font-bold p-3 border-b">Total Cases</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-muted/50 transition-colors bg-white">
                        <td className="p-3 whitespace-nowrap">{row.barangay_name}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 uppercase text-[10px] font-bold rounded-md ${
                            row.triage_level === 'emergency' ? 'bg-red-100 text-red-700' :
                            row.triage_level === 'urgent' ? 'bg-orange-100 text-orange-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {row.triage_level}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono">{row.count}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/30 font-bold border-t-2">
                      <td className="p-3 text-right" colSpan={2}>Grand Total</td>
                      <td className="p-3 text-right font-mono">{grandTotal}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
export default Reports;