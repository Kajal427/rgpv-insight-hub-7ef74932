import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { StudentSearch } from "@/components/StudentSearch";
import { Search } from "lucide-react";

const StudentSearchPage = () => {
  return (
    <div className="min-h-screen bg-[hsl(230,35%,10%)]">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl bg-[hsl(174,72%,50%,0.12)]">
            <Search className="h-7 w-7 text-[hsl(174,72%,50%)]" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Student Search</h1>
            <p className="text-sm text-[hsl(230,15%,45%)]">Search any student's result by enrollment number</p>
          </div>
        </div>
        <StudentSearch />
      </div>
      <Footer />
    </div>
  );
};

export default StudentSearchPage;
