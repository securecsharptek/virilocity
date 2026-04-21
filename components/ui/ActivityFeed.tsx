// ─────────────────────────────────────────────────────────────────────────────
// ActivityFeed Component — V16.4 Live Activity Stream
// ─────────────────────────────────────────────────────────────────────────────
'use client';

export interface FeedItem {
  id: string;
  message: string;
  time: string;
  type: 'teal' | 'gold' | 'green' | 'red';
}

interface ActivityFeedProps {
  items: FeedItem[];
}

const dotStyles = {
  teal: 'bg-[rgba(14,200,198,1)] shadow-[0_0_8px_rgba(14,124,123,0.55)]',
  gold: 'bg-[#C9A84C] shadow-[0_0_8px_rgba(201,168,76,0.5)]',
  green: 'bg-[#1EA550] shadow-[0_0_8px_rgba(30,165,80,0.5)]',
  red: 'bg-[rgba(220,75,55,0.85)] shadow-[0_0_8px_rgba(220,75,55,0.45)]',
};

export default function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <div className="flex flex-col gap-0">
      {items.map((item, index) => (
        <div
          key={item.id}
          className={`
            flex items-start gap-3 py-[11px]
            border-b border-[rgba(255,255,255,0.05)]
            transition-all duration-150
            hover:bg-[rgba(255,255,255,0.02)] hover:rounded-lg
            hover:px-2 hover:-mx-2
            ${index === items.length - 1 ? 'border-b-0' : ''}
          `}
        >
          {/* Status dot */}
          <div
            className={`
              w-2 h-2 rounded-full mt-1 flex-shrink-0
              ${dotStyles[item.type]}
            `}
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div
              className="font-sans text-[12.5px] text-[rgba(255,255,255,0.72)] leading-[1.4]"
              dangerouslySetInnerHTML={{
                __html: item.message.replace(
                  /\*\*(.*?)\*\*/g,
                  '<strong class="text-[rgba(255,255,255,0.95)]">$1</strong>'
                ),
              }}
            />
            <div className="font-mono text-[8.5px] text-[rgba(255,255,255,0.22)] mt-0.5">
              {item.time}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
