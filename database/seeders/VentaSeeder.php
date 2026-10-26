<?php

namespace Database\Seeders;

use App\Models\Venta;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class VentaSeeder extends Seeder
{
    private const DEFAULT_REDES = 'Google_maps; Facebook; WhatsApp (Texto); Gmail; Instagram';

    /**
     * Sales from the WolftekGuard v2 prototype, newest first: [cliente, tipo, cuenta, idcte, lineas, acuerdo, fecha, prioridad, status].
     *
     * @var list<array{0: string, 1: string, 2: string, 3: string, 4: int, 5: string, 6: string, 7: string, 8: string}>
     */
    private const SALES = [
        ['JUAN NOE PADILLA VEGA', 'RENOVACION ANTICIPADA', '507766765', '105258030', 11, '11', '2026-10-15', 'Media', 'Captura'],
        ['GESTORIA ADUANERA DE LOGISTICA EN COMERCIO EXTERIOR SC', 'RENOVACION CIBELES', '507282286', '105318296', 1, '40809174', '2026-10-15', 'Media', 'Terminado'],
        ['GESTORIA ADUANERA DE LOGISTICA EN COMERCIO EXTERIOR SC', 'RENOVACION', '507282286', '105318296', 3, '40809174', '2026-10-15', 'Media', 'Terminado'],
        ['CONJUNTO RESIDENCIAL AVIVIA 58 AC', 'RENOVACION ANTICIPADA CIBELES', '507766715', '105361502', 2, '1', '2026-10-14', 'Alta', 'Líneas Atrapadas'],
        ['FLEXIBLE WAREHOUSING SOLUTIONS S DE RL DE CV', 'RENOVACION Q2', '506991022', '105275831', 6, '4000569694A', '2026-10-14', 'Urgente', 'En Proceso'],
        ['TRANSPORTES DEL BAJIO SA DE CV', 'PORTABILIDAD', '506998412', '105199874', 24, '40807751', '2026-10-13', 'Alta', 'Reingreso'],
        ['CARLOS ALBERTO MENDEZ RUIZ', 'LINEA NUEVA', '507540018', '105287765', 1, '40810446', '2026-10-13', 'Baja', 'No Avanzó a Crédito'],
        ['COMERCIALIZADORA OCCIDENTE SA DE CV', 'AUMENTO DE LINEAS', '507009871', '105233402', 8, '40809921', '2026-10-12', 'Media', 'Terminado'],
        ['LAURA PATRICIA GARZA LEAL', 'CAMBIO DE PLAN', '508004563', '105390018', 1, '40810873', '2026-10-11', 'Baja', 'Cancelada'],
        ['MARIA FERNANDA ROBLES ESQUIVEL', 'LINEA NUEVA', '508112930', '105402217', 2, '40811032', '2026-10-10', 'Media', 'Rechazada'],
        ['GRUPO INDUSTRIAL MEDINA SA DE CV', 'RENOVACION', '507123044', '105244190', 15, '40808810', '2026-10-09', 'Alta', 'Terminado'],
    ];

    /**
     * Known client delivery details, keyed by cuenta.
     *
     * @var array<string, array{rfc: string, rl: string, domicilio: string, encargada: string, telefono: string, horario: string}>
     */
    private const CLIENTS = [
        '507766765' => [
            'rfc' => 'PAVJ711110EU6',
            'rl' => 'JUAN NOE PADILLA VEGA',
            'domicilio' => 'INDEPENDENCIA , 15, INT B, CENTRO, SAN JUAN DE LOS LAGOS, SAN JUAN DE LOS LAGOS, JALISCO, 47000, MEX',
            'encargada' => 'ELSA LORENA PADILLA / ABIGAIL PADILLA PADILLA',
            'telefono' => '3957256197',
            'horario' => 'DE 9:00 A 18:00 HRS',
        ],
        '506991022' => [
            'rfc' => 'FWS1503128K4',
            'rl' => 'CARLOS EDUARDO SALAZAR JOANNIS',
            'domicilio' => 'BLV INDEPENDENCIA, 8851, LOTE BRAVO, JUAREZ, CHIHUAHUA, 32575',
            'encargada' => 'JUANA ROQUE / ESTEBAN VAZQUEZ',
            'telefono' => '6561708553',
            'horario' => 'DE 9:00 A 18:00 HRS',
        ],
        '507282286' => [
            'rfc' => 'GAL0904219T3',
            'rl' => 'MARTHA ELENA GUTIERREZ RIOS',
            'domicilio' => 'AV. TECNOLOGICO, 1250, BODEGA 4, PARQUE INDUSTRIAL, NUEVO LAREDO, TAMAULIPAS, 88275',
            'encargada' => 'MARTHA GUTIERREZ',
            'telefono' => '8671234590',
            'horario' => 'DE 8:00 A 17:00 HRS',
        ],
    ];

    /**
     * Archived expediente documents per sale (1-based position in SALES).
     *
     * @var array<int, list<string>>
     */
    private const DOCS = [
        1 => ['ine', 'curp'],
        2 => ['ine', 'sae', 'curp', 'modelo', 'oc', 'op'],
        3 => ['ine', 'sae', 'curp', 'modelo', 'oc', 'op'],
        4 => ['ine', 'sae', 'curp', 'modelo', 'oc'],
        5 => ['ine', 'sae', 'curp'],
        6 => ['ine', 'sae', 'curp', 'modelo'],
        8 => ['ine', 'sae', 'curp', 'modelo', 'oc', 'op'],
        11 => ['ine', 'sae', 'curp', 'modelo', 'oc', 'op'],
    ];

    /** @var array<int, list<string>> */
    private const OTROS = [2 => ['FOTO_FACHADA.jpg', 'CORREO_AUTORIZACION.pdf']];

    /** @var array<int, list<string>> */
    private const KNOWN_DNS = [4 => ['4774953406', '3951236719']];

    /**
     * [equipo, sku, plan, costo, plazo] used to spread each sale's lines across BOTs.
     *
     * @var list<array{0: string, 1: string, 2: string, 3: bool, 4: string}>
     */
    private const EQUIPOS = [
        ['HONOR X5D MIDNIGTH BLACK ATT', 'N.HOX5DMN', 'ATTv2 ArmaloNEG 299 C', true, '24 meses'],
        ['SAMSUNG GALAXY A56 128GB GRIS ATT', 'N.SMA56128GG', 'ATTv2 ArmaloNEG 399 C', false, '24 meses'],
        ['APPLE IPHONE 17 PRO 256GB AZUL PROFUNDO ATT', 'N.IP17PR256GA', 'ATTv2 ArmaloNEG 599 C', true, '36 meses'],
    ];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        if (Venta::exists()) {
            return;
        }

        foreach (self::SALES as $index => [$cliente, $tipo, $cuenta, $idcte, $lineas, $acuerdo, $fecha, $prioridad, $status]) {
            $position = $index + 1;
            $client = self::CLIENTS[$cuenta] ?? ['rl' => $cliente];
            $capturedAt = Carbon::parse($fecha)->setTime(12, 0)->subMinutes($index);

            $venta = Venta::forceCreate([
                'nombre' => $tipo.' - '.$cliente,
                'razon' => $cliente,
                'cuenta' => $cuenta,
                'idcte' => $idcte,
                'acuerdo' => $acuerdo,
                'tipo' => $tipo,
                'status' => $status,
                'prioridad' => $prioridad,
                'meses' => [],
                'fecha' => $fecha,
                'created_at' => $capturedAt,
                'updated_at' => $capturedAt,
                ...$client,
            ]);

            foreach ($this->botsFor($position, $idcte, $lineas) as $posicion => [$equipo, $dns]) {
                [$nombreEquipo, $sku, $plan, $costo, $plazo] = $equipo;
                $bot = $venta->bots()->create([
                    'posicion' => $posicion,
                    'costo' => $costo,
                    'equipo' => $nombreEquipo,
                    'sku' => $sku,
                    'plan' => $plan,
                    'plazo' => $plazo,
                    'redes' => self::DEFAULT_REDES,
                ]);
                $bot->lineas()->createMany(collect($dns)->map(fn (string $dn, int $i) => ['posicion' => $i, 'dn' => $dn])->all());
            }

            foreach (self::DOCS[$position] ?? [] as $tipoDoc) {
                $venta->documentos()->create(['tipo' => $tipoDoc, 'nombre' => strtoupper($tipoDoc).'_'.$venta->id.'.pdf']);
            }

            foreach (self::OTROS[$position] ?? [] as $nombre) {
                $venta->documentos()->create(['tipo' => Venta::DOCUMENTO_OTROS, 'nombre' => $nombre]);
            }
        }
    }

    /**
     * Plausible DN lines split across up to three BOTs, as the prototype generated them.
     *
     * @return list<array{0: array{0: string, 1: string, 2: string, 3: bool, 4: string}, 1: list<string>}>
     */
    private function botsFor(int $position, string $idcte, int $lineas): array
    {
        $base = (int) substr($idcte, -7);
        $known = self::KNOWN_DNS[$position] ?? [];
        $generated = array_map(fn (int $k) => '477'.str_pad((string) (($base + $k * 37) % 10000000), 7, '0', STR_PAD_LEFT), range(0, $lineas - 1));
        $dns = array_merge($known, array_slice($generated, count($known)));
        $total = count($dns);

        $parts = match (true) {
            $total >= 6 => [
                array_slice($dns, 0, (int) ceil($total / 2)),
                array_slice($dns, (int) ceil($total / 2), (int) ceil($total * 0.75) - (int) ceil($total / 2)),
                array_slice($dns, (int) ceil($total * 0.75)),
            ],
            $total >= 3 => [array_slice($dns, 0, $total - 1), array_slice($dns, -1)],
            default => [$dns],
        };

        return array_map(fn (array $part, int $i) => [self::EQUIPOS[$i], $part], $parts, array_keys($parts));
    }
}
