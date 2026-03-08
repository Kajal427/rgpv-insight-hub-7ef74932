import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const contactInfo = [
  { icon: Mail, label: "Email", value: "support@rgpvanalyzer.com", href: "mailto:support@rgpvanalyzer.com" },
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({ title: "Message sent!", description: "We'll get back to you soon." });
      (e.target as HTMLFormElement).reset();
    }, 1000);
  };

  return (
    <section id="contact" className="py-24 bg-secondary/30" ref={sectionRef}>
      <div className="container mx-auto px-4">
        <div className={`text-center mb-14 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary mb-3">Get In Touch</span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-3 text-foreground">Contact Us</h2>
          <p className="text-muted-foreground max-w-md mx-auto text-sm">
            Have questions about RGPV Analyzer? We'd love to hear from you.
          </p>
        </div>

        <div className={`grid lg:grid-cols-5 gap-10 max-w-5xl mx-auto transition-all duration-700 delay-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {/* Contact Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
              {contactInfo.map((item, i) => (
                <div
                  key={item.label}
                  className={`flex gap-4 items-start transition-all duration-500 ${visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
                  style={{ transitionDelay: `${300 + i * 100}ms` }}
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-card-foreground">{item.label}</p>
                    {item.href ? (
                      <a href={item.href} className="text-muted-foreground text-sm hover:text-primary transition-colors">
                        {item.value}
                      </a>
                    ) : (
                      <p className="text-muted-foreground text-sm">{item.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-br from-primary/10 to-accent/30 rounded-2xl border border-primary/20 p-6">
              <p className="font-display font-semibold text-sm text-foreground mb-1">Working Hours</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Monday – Friday: 9:00 AM – 6:00 PM<br />
                Saturday: 10:00 AM – 2:00 PM
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-3 bg-card rounded-2xl border border-border p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input placeholder="Your Name" required className="bg-background" />
              <Input type="email" placeholder="Your Email" required className="bg-background" />
            </div>
            <Input placeholder="Subject" required className="bg-background" />
            <Textarea placeholder="Your Message" rows={4} required className="bg-background resize-none" />
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? "Sending..." : (
                <>
                  Send Message
                  <Send className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};
