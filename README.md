# Regresión y correlación · ¿Los salarios acompañan a la inflación?

Presentación interactiva para el trabajo final de Estadística. Analiza el índice de salarios y el IPC del INDEC (enero de 2025 a agosto de 2026) con correlación de Pearson, regresión lineal simple y coeficiente de determinación.

Es HTML, CSS y JavaScript sin dependencias: las tipografías están incluidas, así que funciona sin internet en el aula.

## Cómo abrirla

- **Sin instalar nada:** abrir `index.html` con doble clic (Chrome, Edge o Firefox).
- **En línea (GitHub Pages):** `https://candelacorradin.github.io/regresion-lineal/`.

## Antes de presentar

Opcional: poner los nombres del grupo en `js/config.js`.

```js
integrantes: ['Ana', 'Bruno', 'Carla', 'Diego'],   // por defecto: Participante 1 a 4
```

Los nombres no se proyectan: solo aparecen en las notas del orador y en el modo presentador.

## Atajos

| Tecla | Acción |
| --- | --- |
| `→` `Espacio` `Av Pág` | Siguiente paso o diapositiva (funciona con presentadores inalámbricos) |
| `←` `Re Pág` | Anterior |
| `N` | Notas del orador en la misma pantalla |
| `P` | Modo presentador en otra ventana: notas, reloj por integrante y vista de lo que sigue |
| `O` | Índice de todas las diapositivas |
| `F` | Pantalla completa |
| `?` | Ayuda |

Para usar el modo presentador con proyector: abrir la presentación, apretar `P`, pasar la ventana principal al proyector en pantalla completa y dejar la del presentador en la notebook.

## Qué tiene de interactivo

| Diapositiva | Interacción |
| --- | --- |
| Precios y salarios | El gráfico se dibuja al entrar; al pasar el mouse muestra cada mes |
| Dos índices del INDEC | Tabla completa de los 20 meses; al tocar un mes muestra cómo se encadena el índice |
| Correlación y regresión | Botón para intercambiar X e Y: r no cambia, la pendiente sí |
| Cada punto es un mes | Los puntos aparecen en orden cronológico; forma, sentido y fuerza paso a paso |
| Pearson | Control para mover r de −1 a 1 y ver la nube; ejemplo de una curva con r = 0 |
| La trampa de las tendencias | Los mismos puntos viajan de niveles a variaciones mensuales y r baja de 0,996 a 0,05 |
| Mínimos cuadrados | Controles de a y b para ajustar la recta a mano y ver Σ(y − ŷ)²; botón que la lleva al mínimo |
| Estimar | Control de IPC con interpolación y extrapolación marcadas sobre el gráfico |
| Residuos | Barras de cada mes y la curva de las “olas” |
| R² | Alterna entre niveles (99,2 %) y variaciones mensuales (0,3 %) |
| Excel | Fórmulas que se copian con un clic; los colores marcan el orden Y, X |
| Repaso | Cuatro preguntas para el curso |

## Datos

Las variaciones mensuales que publica el INDEC están en `js/data.js`, y todos los resultados (r, b, a, R², residuos, sumatorias) se calculan en el navegador a partir de ellas. Coinciden con el Excel del grupo: r = 0,996, ŷ = −12,61 + 1,149·x, R² = 0,992 y r mensual = 0,05.

`datos/indec_2025_2026.csv` tiene la misma tabla para abrir en Excel.

Fuentes: INDEC, Índice de precios al consumidor (informes técnicos de septiembre de 2025 y agosto de 2026) e Índice de salarios (informe técnico de agosto de 2026, publicado el 21/10/2026). [indec.gob.ar](https://www.indec.gob.ar)

## Estructura

```
index.html        diapositivas y notas del orador
presenter.html    ventana del modo presentador
css/styles.css    estilos
js/config.js      nombres del grupo y fecha
js/data.js        datos del INDEC y cálculos
js/charts.js      utilidades para gráficos SVG
js/slides.js      interacciones de cada diapositiva
js/deck.js        navegación, notas e índice
fonts/            Space Grotesk y Public Sans (licencia OFL)
datos/            datos en CSV
```
