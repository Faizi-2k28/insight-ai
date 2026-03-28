import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import MarqueeSection from "@/components/MarqueeSection";
import PreviewSection from "@/components/PreviewSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="flex flex-col w-full">
      <Navbar />
      <HeroSection />
      <MarqueeSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PreviewSection />
      <CTASection />
      <Footer />
    </main>
  );
}
