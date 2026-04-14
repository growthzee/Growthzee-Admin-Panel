// lib/taskCategories.ts
// 3-level taxonomy: Category → SubCategory → TaskType

export type TaskTaxonomy = {
  emoji: string;
  label: string;
  subCategories: {
    emoji: string;
    label: string;
    tasks: string[];
  }[];
};

export const TASK_CATEGORIES: TaskTaxonomy[] = [
  {
    emoji: "📱",
    label: "Social Media Management",
    subCategories: [
      {
        emoji: "🎨",
        label: "Content Creation",
        tasks: [
          "Creative Post (Static)",
          "Carousel Post",
          "Reel (Video Editing + Concept)",
          "Story Design",
          "Meme Post",
          "Festival Post",
          "Trending Content",
        ],
      },
      {
        emoji: "📅",
        label: "Posting & Management",
        tasks: [
          "Post Scheduling",
          "Caption Writing",
          "Hashtag Research",
          "Comment Reply",
          "DM Handling",
        ],
      },
      {
        emoji: "📈",
        label: "Growth Tasks",
        tasks: [
          "Page Optimization (Bio, Highlights)",
          "Competitor Research",
          "Trend Research",
          "Engagement Strategy",
        ],
      },
    ],
  },
  {
    emoji: "📢",
    label: "Paid Ads (Performance Marketing)",
    subCategories: [
      {
        emoji: "⚙️",
        label: "Setup",
        tasks: [
          "Ad Account Setup",
          "Pixel Setup",
          "Conversion API Setup",
          "Audience Research",
        ],
      },
      {
        emoji: "🎯",
        label: "Campaign Tasks",
        tasks: [
          "Campaign Creation",
          "Ad Set Setup",
          "Ad Creative Upload",
        ],
      },
      {
        emoji: "🎨",
        label: "Creatives for Ads",
        tasks: [
          "Ads Creative (Static)",
          "Ads Carousel",
          "Ads Reel / Video",
        ],
      },
      {
        emoji: "📊",
        label: "Optimization",
        tasks: [
          "Daily Monitoring",
          "A/B Testing",
          "Budget Optimization",
          "Scaling Campaigns",
        ],
      },
      {
        emoji: "📄",
        label: "Reporting",
        tasks: ["Weekly Report", "Monthly Report"],
      },
    ],
  },
  {
    emoji: "🌐",
    label: "Website / SEO",
    subCategories: [
      {
        emoji: "🎨",
        label: "Website Design",
        tasks: ["Web Banner", "Landing Page Design", "UI/UX Improvements"],
      },
      {
        emoji: "🧑‍💻",
        label: "Development",
        tasks: [
          "Page Creation",
          "Speed Optimization",
          "Mobile Optimization",
          "Bug Fixing",
        ],
      },
      {
        emoji: "🔍",
        label: "SEO (On-Page)",
        tasks: [
          "Keyword Research",
          "Meta Tags Optimization",
          "Image Optimization",
          "Internal Linking",
        ],
      },
      {
        emoji: "🔗",
        label: "SEO (Off-Page)",
        tasks: ["Backlink Creation", "Directory Submission", "Guest Posting"],
      },
      {
        emoji: "✍️",
        label: "Content",
        tasks: ["Blog Writing", "Blog Upload", "SEO Content Optimization"],
      },
    ],
  },
  {
    emoji: "🛒",
    label: "E-commerce Management",
    subCategories: [
      {
        emoji: "📦",
        label: "Product Listing",
        tasks: [
          "Product Upload",
          "Title Optimization",
          "Bullet Points Writing",
          "Description Writing",
          "SEO Keywords",
        ],
      },
      {
        emoji: "🎨",
        label: "Creatives",
        tasks: [
          "Product Images Design",
          "A+ Content (Amazon)",
          "Store Banner",
        ],
      },
      {
        emoji: "📊",
        label: "Sales Management",
        tasks: [
          "Inventory Management",
          "Order Monitoring",
          "Pricing Optimization",
        ],
      },
      {
        emoji: "📢",
        label: "Ads (Marketplace)",
        tasks: [
          "Amazon PPC Setup",
          "Campaign Optimization",
          "Keyword Bidding",
        ],
      },
      {
        emoji: "⭐",
        label: "Reviews",
        tasks: ["Review Management", "Feedback Handling"],
      },
    ],
  },
  {
    emoji: "🤝",
    label: "Client Management",
    subCategories: [
      {
        emoji: "📋",
        label: "Client Management",
        tasks: [
          "Client Onboarding",
          "Requirement Gathering",
          "Strategy Planning",
          "Monthly Meeting",
          "Feedback Collection",
        ],
      },
    ],
  },
  {
    emoji: "📊",
    label: "Reporting & Analysis",
    subCategories: [
      {
        emoji: "📊",
        label: "Reporting & Analysis",
        tasks: [
          "Performance Analysis",
          "ROI Tracking",
          "Competitor Analysis",
          "Monthly Insights",
        ],
      },
    ],
  },
  {
    emoji: "🧠",
    label: "Strategy & Planning",
    subCategories: [
      {
        emoji: "🧠",
        label: "Strategy & Planning",
        tasks: [
          "Marketing Strategy",
          "Funnel Planning",
          "Offer Creation",
          "Campaign Planning",
        ],
      },
    ],
  },
  {
    emoji: "🎬",
    label: "Video Production",
    subCategories: [
      {
        emoji: "🎬",
        label: "Video Production",
        tasks: [
          "Script Writing",
          "Shoot Planning",
          "Video Shooting",
          "Editing",
          "Voiceover",
        ],
      },
    ],
  },
  {
    emoji: "🤖",
    label: "Automation / Tools",
    subCategories: [
      {
        emoji: "🤖",
        label: "Automation / Tools",
        tasks: [
          "CRM Setup",
          "Email Marketing Setup",
          "WhatsApp Automation",
          "Zapier Integration",
        ],
      },
    ],
  },
];

// Helper: get subCategories for a given category label
export function getSubCategories(categoryLabel: string) {
  return TASK_CATEGORIES.find((c) => c.label === categoryLabel)?.subCategories ?? [];
}

// Helper: get tasks for a given category + subCategory
export function getTaskTypes(categoryLabel: string, subCategoryLabel: string) {
  return (
    getSubCategories(categoryLabel).find((s) => s.label === subCategoryLabel)
      ?.tasks ?? []
  );
}

// Helper: get emoji for a category
export function getCategoryEmoji(label: string) {
  return TASK_CATEGORIES.find((c) => c.label === label)?.emoji ?? "📋";
}

// Helper: get emoji for a sub-category
export function getSubCategoryEmoji(categoryLabel: string, subLabel: string) {
  return (
    getSubCategories(categoryLabel).find((s) => s.label === subLabel)?.emoji ??
    "•"
  );
}
