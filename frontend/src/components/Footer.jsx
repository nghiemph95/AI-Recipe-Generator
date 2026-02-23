import { useTranslation } from 'react-i18next';
import { Heart } from 'lucide-react';

const TECH = [
  'React',
  'Vite',
  'Tailwind CSS',
  'Node.js',
  'Express',
  'PostgreSQL',
  'Google Gemini AI',
];

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="mt-auto border-t border-gray-200 bg-white/80 py-3 px-4">
      <div className="max-w-7xl mx-auto text-center">
        <p className="text-xs text-gray-600 flex flex-wrap items-center justify-center gap-x-1 gap-y-0">
          {t('footer.builtWith')}{' '}
          {TECH.map((tech, i) => (
            <span key={tech}>
              <span className="font-medium text-gray-700">{tech}</span>
              {i < TECH.length - 1 ? ', ' : ''}
            </span>
          ))}
          <span className="mx-1 text-gray-400">·</span>
          {t('footer.createdBy')}{' '}
          <span className="font-medium text-gray-700">Nghiem Pham</span>
          <Heart className="w-3 h-3 text-emerald-500 fill-emerald-500 inline" />
        </p>
      </div>
    </footer>
  );
};

export default Footer;
