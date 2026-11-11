import Cultivation from './Cultivation';
import styles from './Life.module.css';


import type { LifeController } from './useLife';

export function LifeCultivation({ profile, setProfile, setStep }: LifeController) {
return <Cultivation profile={profile} onExit={() => setStep('mode')} onFinish={updated => { setProfile(updated); setStep('home'); }} />;

}
