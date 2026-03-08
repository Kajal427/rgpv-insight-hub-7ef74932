import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const contactInfo = [
  { icon: Mail, label: "Email", value: "supportrgpv@gmail.com", href: "mailto:supportrgpv@gmail.com" },
  { icon: Phone, label: "Phone", value: "+91 98765 43210", href: "tel:+919876543210" },
  { icon: MapPin, label: "Address", value: "RGPV Campus, Bhopal, Madhya Pradesh, India", href: null },
];

export const ContactSection = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const subject = formData.get("subject") as string;
    const message = formData.get("message") as string;

    try {
      const { data, error } = await supabase.functions.invoke("send-contact-email", {
        body: { name, email, subject, message },
      });

      if (error) throw error;

      toast({ title: "Message sent!", description: "We'll get back to you soon." });
      form.reset();
    } catch (err: any) {
      toast({
        title: "Failed to send message",
        description: err?.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="py-24 bg-[hsl(230,35%,10%)] relative" ref={sectionRef}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(240,40%,15%)_0%,transparent_60%)]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className={`text-center mb-14 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[hsl(220,60%,65%)] mb-3">Get In Touch</span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-3 text-white">Contact Us</h2>
          <p className="text-[hsl(230,15%,55%)] max-w-md mx-auto text-sm">
            Have questions about RGPV Analyzer? We'd love to hear from you.
          </p>
        </div>

        <div className={`max-w-3xl mx-auto transition-all duration-700 delay-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <form onSubmit={handleSubmit} className="bg-[hsl(230,30%,14%)] rounded-2xl border border-[hsl(230,20%,20%)] p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input name="name" placeholder="Your Name" required className="bg-[hsl(230,30%,10%)] border-[hsl(230,20%,20%)] text-white placeholder:text-[hsl(230,15%,40%)] focus:border-[hsl(240,50%,55%)]" />
              <Input name="email" type="email" placeholder="Your Email" required className="bg-[hsl(230,30%,10%)] border-[hsl(230,20%,20%)] text-white placeholder:text-[hsl(230,15%,40%)] focus:border-[hsl(240,50%,55%)]" />
            </div>
            <Input name="subject" placeholder="Subject" required className="bg-[hsl(230,30%,10%)] border-[hsl(230,20%,20%)] text-white placeholder:text-[hsl(230,15%,40%)] focus:border-[hsl(240,50%,55%)]" />
            <Textarea name="message" placeholder="Your Message" rows={4} required className="bg-[hsl(230,30%,10%)] border-[hsl(230,20%,20%)] text-white placeholder:text-[hsl(230,15%,40%)] focus:border-[hsl(240,50%,55%)] resize-none" />
            <Button type="submit" className="w-full gap-2 bg-[hsl(240,50%,55%)] hover:bg-[hsl(240,50%,60%)] text-white" disabled={loading}>
              {loading ? "Sending..." : (
                <>Send Message <Send className="h-4 w-4" /></>
              )}
            </Button>
          </form>

          <div className={`flex flex-wrap justify-center gap-6 mt-6 transition-all duration-500 delay-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            {contactInfo.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <item.icon className="h-4 w-4 text-[hsl(220,60%,65%)]" />
                {item.href ? (
                  <a href={item.href} className="text-[hsl(230,15%,55%)] text-sm hover:text-[hsl(220,60%,65%)] transition-colors">
                    {item.value}
                  </a>
                ) : (
                  <span className="text-[hsl(230,15%,55%)] text-sm">{item.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
