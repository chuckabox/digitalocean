import { motion, useReducedMotion } from 'framer-motion'
import { DotLottiePlayer } from '@dotlottie/react-player'
import { Button } from './ui/button'

interface LandingPageProps {
  onEnterApp: () => void
  starting?: boolean
  startError?: string | null
}

export default function LandingPage({ onEnterApp, starting = false, startError = null }: LandingPageProps) {
  const reduce = useReducedMotion()

  return (
    <div className="flex flex-col w-full relative">
      {/* Hero Section */}
      <section className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-12 items-center pt-8 pb-24">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-start text-left"
        >
          <h1 className="font-sans text-[48px] md:text-[64px] tracking-tight leading-[1.05] font-medium text-ink mb-8 max-w-[12ch]">
            Understand the room.
          </h1>
          <p className="font-sans text-[18px] text-ink-2 leading-relaxed max-w-[45ch] mb-10">
            A consented social co-pilot that helps you read social cues during one-on-one conversations.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="rounded-full px-8 font-medium"
            disabled={starting}
            onClick={onEnterApp}
          >
            {starting ? 'Starting…' : 'Start Session'}
          </Button>
          {startError && (
            <p className="mt-3 text-sm text-alert" role="alert">
              {startError}
            </p>
          )}
        </motion.div>

        {/* Illustration */}
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="relative w-full flex items-center justify-center lg:justify-end"
        >
          <img
            src="/group-communicating.svg"
            alt="Group of people communicating"
            className="w-full max-w-[600px] h-auto object-contain scale-110 md:scale-125 origin-center"
          />
        </motion.div>
      </section>

      {/* Core Features */}
      <section className="w-[100vw] relative left-[50%] right-[50%] -mx-[50vw] bg-paper-2 py-24 px-7">
        <div className="max-w-[1160px] mx-auto">
          <h2 className="font-sans text-[28px] md:text-[32px] tracking-tight font-medium text-ink mb-16 text-center">
            Core features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {[
            {
              title: 'Live Nudges',
              desc: 'Gentle suggestions delivered privately in the moment when meaningful shifts occur.',
            },
            {
              title: 'The Debrief',
              desc: 'An annotated timeline and plain-language summary of the conversation afterward.',
            },
            {
              title: 'Privacy First',
              desc: 'Analyzed locally. Video and audio are never saved or transmitted to the cloud.',
            },
            {
              title: 'Two-Party Consent',
              desc: 'Complies with strict two-party consent laws like California. Operates only when both sides explicitly agree.',
            }
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-start text-left bg-white rounded-xl p-8 md:p-10"
            >
              <h3 className="font-sans text-[18px] font-medium text-ink mb-3">{feature.title}</h3>
              <p className="font-sans text-[15px] text-ink-2 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="relative max-w-[1160px] mx-auto text-center pt-24 pb-32">
        <h2 className="font-sans text-[28px] md:text-[32px] tracking-tight font-medium text-ink mb-16 text-center">
          Our approach
        </h2>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center text-left"
        >
          <div className="w-full flex items-center justify-center lg:justify-end pr-0 lg:pr-8">
            <img src="/notification.svg" alt="Notification illustration" className="w-full max-w-[350px] h-auto object-contain" />
          </div>
          <div className="flex flex-col items-start bg-white rounded-xl p-8 md:p-10 w-full">
            <h2 className="font-sans text-[28px] md:text-[32px] tracking-tight font-medium text-ink mb-4">
              A translator, not a lie detector.
            </h2>
            <p className="font-sans text-[16px] text-ink-2 leading-relaxed max-w-[45ch]">
              Wavelength does not judge inner states or fix people. It is built as an accommodation for neurodivergent individuals to help both sides of a conversation understand each other better.
            </p>
          </div>
        </motion.div>
      </section>

      {/* How it Works (Steps) */}
      <section className="w-[100vw] relative left-[50%] right-[50%] -mx-[50vw] bg-paper-2 py-32 px-7">
        <div className="max-w-[1160px] mx-auto">
          <h2 className="font-sans text-[28px] md:text-[32px] tracking-tight font-medium text-ink mb-16 text-center">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { num: '01', title: 'Start Session', desc: 'Secure mutual consent and start the camera. Analysis runs entirely locally on your device.' },
              { num: '02', title: 'Get Live Nudges', desc: 'Receive discreet, gentle suggestions in the moment when meaningful shifts occur in the conversation.' },
              { num: '03', title: 'Review the Debrief', desc: 'After the session, review an annotated timeline and a plain-language summary of how it went.' }
            ].map((step, i) => (
              <motion.div
                key={step.num}
                initial={reduce ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-start text-left bg-white rounded-xl p-8 md:p-10"
              >
                <div className="font-mono text-[13px] font-medium text-ink-3 tracking-[0.15em] mb-4">{step.num}</div>
                <h3 className="font-sans text-[18px] font-medium text-ink mb-2">{step.title}</h3>
                <p className="font-sans text-[15px] text-ink-2 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Founders */}
      <section className="relative w-[100vw] left-[50%] right-[50%] -mx-[50vw] pt-24 pb-32 overflow-hidden">
        {/* Background Zigzag Continuous Wave (Scoping to this section) */}
        <div className="absolute inset-0 -z-10 pointer-events-none opacity-20 flex flex-col items-center justify-center pt-10" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="w-[120vw] h-[400px] md:h-[600px] -my-[120px] md:-my-[180px] flex-shrink-0"
              style={{ transform: i % 2 === 0 ? 'rotate(15deg)' : 'rotate(15deg) scaleX(-1)' }}
            >
              <DotLottiePlayer src="/wave.lottie" autoplay loop style={{ width: '100%', height: '100%' }} />
            </div>
          ))}
        </div>

        <div className="max-w-[1160px] mx-auto px-7 text-center">
          <h2 className="font-sans text-[24px] md:text-[28px] tracking-tight font-medium text-ink mb-2">
            Built by
          </h2>
          <p className="font-sans text-[15px] text-ink-2 mb-16">
            A team of students from Australia.
          </p>
          <div className="flex flex-col md:flex-row items-start justify-center gap-12 md:gap-24">
            {[
              { name: 'Peter Ma', role: 'Software Engineering Student', link: 'https://www.linkedin.com/in/peterzma/', img: '/peter.jpg' },
              { name: 'Connor Deng', role: 'Electrical Engineering Student', link: 'https://www.linkedin.com/in/connordeng/', img: '/connor.jpg' },
              { name: 'Dinil Balasuriya', role: 'Computer Science Student', link: 'https://www.linkedin.com/in/dinilb/', img: '/dinil.jpg' }
            ].map((founder) => (
              <a
                key={founder.name}
                href={founder.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center text-center"
              >
                <div className="w-28 h-28 rounded-full overflow-hidden mb-4 border border-rule group-hover:border-accent transition-colors shadow-sm">
                  <img src={founder.img} alt={founder.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <h3 className="font-sans text-[16px] font-medium text-ink group-hover:text-accent transition-colors">
                  {founder.name}
                </h3>
                <p className="font-sans text-[14px] text-ink-3">
                  {founder.role}
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
