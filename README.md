# SynoSec-buildathon

 - [] Utveckla UI/UX
 - [Bashar] Implementera testning för varje lager. 
 
 - [] Utveckla ett system med sårbarheter att testa emot.
 - [] Peka testningen mot ett specifikt server URL, NAMN, ID, IP.
 - [] Konfigurera att Ai gör en depth-first sökning.
 - [] 



## AI config:
1. Avgöra vilk system som ska testas.
2. Gör en planering för Agenterna.
3. Agenterna ska samla information om systemet.
4. Testa och notera resultatet.
5. Synkronisera resultaten med ai och resterande agenter.
6. Bestämma bästa möjliga resultat för nästa steg. 
7. Avsluta när alla noder har utforskats.

## Smoke test

Run the Docker E2E smoke test:

```bash
make smoke-e2e
```

The smoke run starts the stack, scans `synosec-target:8888`, and prints:

- the derived graph nodes
- tool-run authorization/denial state
- findings discovered
- audit highlights that illustrate the workflow
- the generated report summary
 
