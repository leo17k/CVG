-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 14-04-2026 a las 05:07:57
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `proyecto-cvg`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias`
--

CREATE TABLE `categorias` (
  `id_categoria` int(11) NOT NULL,
  `nombre_categoria` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `categorias`
--

INSERT INTO `categorias` (`id_categoria`, `nombre_categoria`, `descripcion`) VALUES
(9, 'Papelería y Oficina', 'Resmas de papel, bolígrafos, carpetas y consumibles.'),
(10, 'Limpieza', 'Artículos de aseo y desinfección para oficinas.'),
(11, 'Tecnología', 'Equipos de computación, periféricos y cables.'),
(12, 'Mobiliario', 'Sillas, escritorios y estantes.'),
(13, 'Comestibles', 'Todo aquel que se consume'),
(14, 'Idrocarburos', 'compuestos orgánicos formados exclusivamente por átomos de carbono e hidrógeno');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `centro_costo`
--

CREATE TABLE `centro_costo` (
  `id_centro_costo` int(11) NOT NULL,
  `codigo_centro` varchar(100) NOT NULL,
  `id_gerencia` int(11) DEFAULT NULL,
  `presupuesto_asignado` decimal(15,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `centro_costo`
--

INSERT INTO `centro_costo` (`id_centro_costo`, `codigo_centro`, `id_gerencia`, `presupuesto_asignado`) VALUES
(1, '444', 2, 300000.00),
(2, '445', 1, 400000.00),
(3, '404', 5, 350000.00),
(4, '4099', 6, 800000.00),
(5, '0101', 8, 400000.00),
(6, '9012', 9, 350000.00),
(7, '1332', 7, 320000.00);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `chats`
--

CREATE TABLE `chats` (
  `id_chat` int(11) NOT NULL,
  `id_solicitud` int(11) DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `tipo` enum('individual','grupal') DEFAULT 'individual'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `chats`
--

INSERT INTO `chats` (`id_chat`, `id_solicitud`, `fecha_creacion`, `tipo`) VALUES
(2, 20, '2026-03-09 06:05:47', 'individual'),
(3, 9, '2026-03-09 06:59:32', 'individual'),
(4, NULL, '2026-04-06 13:55:56', 'individual');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `chat_participantes`
--

CREATE TABLE `chat_participantes` (
  `id_chat` int(11) NOT NULL,
  `id_usuario` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `chat_participantes`
--

INSERT INTO `chat_participantes` (`id_chat`, `id_usuario`) VALUES
(2, 1),
(2, 10),
(3, 1),
(3, 6),
(4, 1),
(4, 12);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalles_solicitud`
--

CREATE TABLE `detalles_solicitud` (
  `id_detalle` int(11) NOT NULL,
  `id_solicitud` int(11) NOT NULL,
  `descripcion_producto` varchar(255) NOT NULL,
  `cantidad` int(11) NOT NULL DEFAULT 1,
  `precio_unitario_estimado` decimal(12,2) DEFAULT NULL,
  `subtotal` decimal(12,2) GENERATED ALWAYS AS (`cantidad` * `precio_unitario_estimado`) VIRTUAL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `gerencias`
--

CREATE TABLE `gerencias` (
  `id_gerencia` int(11) NOT NULL,
  `nombre_gerencia` varchar(100) NOT NULL,
  `codigo` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `gerencias`
--

INSERT INTO `gerencias` (`id_gerencia`, `nombre_gerencia`, `codigo`) VALUES
(1, 'Gestión energética ', '4423'),
(2, 'Compra y venta', '5533'),
(5, 'Informatica', '404'),
(6, 'Mantenimiento', '7099'),
(7, 'Seguridad', '1332'),
(8, 'Recursos Humanos', '0101'),
(9, 'Seguridad Laboral', '9012'),
(10, 'Gerencia de Logística', 'LOG-01'),
(11, 'Gerencia de Recursos Humanos', 'RRHH-02'),
(12, 'Gerencia de Tecnología', 'TI-03'),
(13, 'Gerencia de Administración', 'ADM-04');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `historial_estados`
--

CREATE TABLE `historial_estados` (
  `id_historial` int(11) NOT NULL,
  `id_solicitud` int(11) NOT NULL,
  `estado_anterior` varchar(50) DEFAULT NULL,
  `estado_nuevo` varchar(50) DEFAULT NULL,
  `fecha_cambio` timestamp NOT NULL DEFAULT current_timestamp(),
  `usuario_responsable` varchar(100) DEFAULT NULL,
  `comentarios_observacion` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `inventario_movimientos`
--

CREATE TABLE `inventario_movimientos` (
  `id_movimiento` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `id_usuario` int(10) UNSIGNED NOT NULL,
  `tipo_movimiento` enum('Entrada','Salida','Ajuste') NOT NULL,
  `cantidad` int(11) NOT NULL,
  `fecha_movimiento` timestamp NOT NULL DEFAULT current_timestamp(),
  `motivo` varchar(255) DEFAULT NULL,
  `id_solicitud` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `inventario_movimientos`
--

INSERT INTO `inventario_movimientos` (`id_movimiento`, `id_producto`, `id_usuario`, `tipo_movimiento`, `cantidad`, `fecha_movimiento`, `motivo`, `id_solicitud`) VALUES
(1, 16, 1, 'Salida', 1, '2026-03-30 07:02:26', 'Se necesitaba', 35),
(2, 17, 1, 'Entrada', 1, '2026-03-30 07:03:25', NULL, 13);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `mensajes`
--

CREATE TABLE `mensajes` (
  `id_mensaje` int(11) NOT NULL,
  `id_chat` int(11) NOT NULL,
  `id_emisor` int(10) UNSIGNED NOT NULL,
  `contenido` text NOT NULL,
  `fecha_envio` timestamp NOT NULL DEFAULT current_timestamp(),
  `leido` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `mensajes`
--

INSERT INTO `mensajes` (`id_mensaje`, `id_chat`, `id_emisor`, `contenido`, `fecha_envio`, `leido`) VALUES
(1, 2, 1, 'Solicitud de ajuste en el campo \"resumen\": xd. Valor actual: 1234', '2026-03-09 06:05:47', 1),
(2, 2, 1, 'Solicitud de ajuste en el campo \"resumen\": xd. Valor actual: 1234', '2026-03-09 06:11:46', 1),
(3, 3, 1, 'Solicitud de ajuste en el campo \"resumen\": oye esta mal. Valor actual: 23', '2026-03-09 06:59:33', 1),
(5, 3, 1, 'Solicitud de ajuste en el campo \"resumen\": alo. Valor actual: 23', '2026-03-09 07:33:39', 1),
(6, 3, 6, 'Oye no esta mal ?', '2026-03-09 07:34:49', 1),
(7, 2, 1, 'si ?', '2026-03-09 07:36:02', 1),
(8, 2, 1, '?que esta mal', '2026-03-09 07:36:23', 1),
(9, 2, 1, 'Solicitud de ajuste en el campo \"justificacion\": es justificacion no sirve mmgv . Valor actual: la seguridad es lo mas primordial para el tebajador por eso las botas de seguridad es un elemento fundamental para si proteccion\r\n', '2026-03-09 14:41:03', 1),
(10, 2, 1, 'Solicitud de ajuste en el campo \"resumen\": jdjjd\n. Valor actual: 1234', '2026-03-09 14:43:45', 1),
(11, 2, 1, 'Solicitud de ajuste en el campo \"resumen\": xd. Valor actual: 123', '2026-03-09 14:46:27', 1),
(12, 2, 1, 'Solicitud de ajuste en el campo \"resumen\": OYE EL RESUME DICE QUE BOTAS DE SEGURIDAD Y AYER HUBO SE DESPACHO VARIAS BOTAS. Valor actual: Botas de Seguridad', '2026-03-09 15:36:19', 1),
(13, 3, 6, 'alo', '2026-03-11 23:20:19', 1),
(14, 3, 6, ' fue', '2026-03-11 23:20:22', 1),
(15, 3, 1, 'alo', '2026-03-11 23:20:27', 1),
(16, 3, 1, 'alo', '2026-03-11 23:20:38', 1),
(24, 2, 1, 'hola', '2026-03-12 02:06:04', 1),
(26, 3, 6, 'por que si brou', '2026-03-12 02:10:33', 1),
(27, 3, 6, 'como asi?', '2026-03-12 02:11:33', 1),
(28, 3, 1, 'xd', '2026-03-12 02:11:36', 1),
(29, 3, 1, 'alo', '2026-03-12 02:11:39', 1),
(30, 3, 1, 'xd', '2026-03-12 02:11:43', 1),
(31, 3, 1, 'alo', '2026-03-12 02:12:16', 1),
(32, 3, 6, 'xd', '2026-03-12 02:12:19', 1),
(33, 3, 6, 'pero', '2026-03-12 02:12:42', 1),
(34, 3, 1, 'alo', '2026-03-12 02:13:49', 1),
(35, 3, 1, 'como que alo?', '2026-03-12 02:16:00', 1),
(36, 3, 6, 'xd', '2026-03-12 02:16:05', 1),
(37, 3, 1, 'alo', '2026-03-12 02:16:37', 1),
(38, 3, 1, 'si', '2026-03-12 02:23:09', 1),
(39, 3, 6, 'no', '2026-03-12 02:23:15', 1),
(40, 3, 1, 'ok', '2026-03-12 02:29:28', 1),
(41, 3, 6, 'no', '2026-03-12 02:29:44', 1),
(42, 2, 1, 'alo', '2026-03-12 02:30:12', 1),
(43, 2, 1, 'alo', '2026-03-12 02:30:14', 1),
(44, 3, 1, 'alo', '2026-03-12 02:30:21', 1),
(45, 3, 1, 'alo', '2026-03-12 02:30:22', 1),
(46, 3, 1, 'que fue', '2026-03-12 02:30:37', 1),
(47, 3, 6, 'njd', '2026-03-12 02:30:42', 1),
(48, 3, 1, 'conetador?', '2026-03-12 02:30:58', 1),
(49, 3, 1, 'alo', '2026-03-12 02:31:23', 1),
(50, 3, 1, 'por que mi mensaje no se ve?', '2026-03-12 02:31:33', 1),
(51, 3, 1, 'alo', '2026-03-12 02:32:05', 1),
(52, 3, 6, 'njb', '2026-03-12 02:32:13', 1),
(53, 3, 6, 'que paso', '2026-03-12 02:32:16', 1),
(54, 3, 1, 'q fue', '2026-03-12 02:34:09', 1),
(55, 3, 1, 'xd', '2026-03-12 02:35:02', 1),
(56, 3, 1, 'xd', '2026-03-12 02:37:34', 1),
(57, 3, 1, 'xd', '2026-03-12 02:38:16', 1),
(58, 3, 1, 'pero', '2026-03-12 02:38:35', 1),
(59, 3, 1, 'alo', '2026-03-12 02:39:27', 1),
(60, 3, 6, 'que hay loco dimelo', '2026-03-12 02:39:34', 1),
(61, 3, 1, 'xd', '2026-03-12 02:41:42', 1),
(62, 2, 10, 'Ey', '2026-03-12 02:42:18', 1),
(63, 2, 10, 'Que paso con el chat ? ', '2026-03-12 02:42:29', 1),
(64, 3, 1, 'alo', '2026-03-12 02:42:39', 1),
(65, 3, 6, 'dime', '2026-03-12 02:42:44', 1),
(66, 2, 1, 'nada mano', '2026-03-12 02:43:00', 1),
(67, 2, 10, 'Uy me había asustado ', '2026-03-12 02:43:08', 1),
(68, 2, 10, 'Épale ', '2026-03-12 04:58:25', 1),
(69, 2, 10, 'Que fue ', '2026-03-12 04:58:41', 1),
(70, 2, 1, 'que haces mano?', '2026-03-12 04:59:03', 1),
(71, 2, 10, 'Alo', '2026-03-12 04:59:10', 1),
(72, 2, 10, 'Mera ', '2026-03-12 04:59:27', 1),
(73, 2, 1, 'q?', '2026-03-12 04:59:32', 1),
(74, 2, 10, 'Dice mi papá que no vengas a las casa que va a llover ', '2026-03-12 04:59:46', 1),
(75, 2, 1, 'njd', '2026-03-12 04:59:51', 1),
(76, 2, 1, 'yo queria jugar play', '2026-03-12 05:00:01', 1),
(77, 2, 1, 'que haces?', '2026-03-12 05:00:07', 1),
(78, 2, 10, 'Nada mano viendo aquí un beta ', '2026-03-12 05:00:23', 1),
(79, 2, 10, 'Ahh dale pues chao ', '2026-03-12 05:00:33', 1),
(80, 2, 10, 'Mera ', '2026-03-12 05:00:40', 1),
(81, 2, 10, 'Alo', '2026-03-12 05:01:17', 1),
(82, 3, 1, 'ey', '2026-03-12 05:01:29', 1),
(83, 2, 1, 'ey', '2026-03-12 05:01:37', 1),
(84, 2, 10, 'Que paso ? ', '2026-03-12 05:01:45', 1),
(85, 2, 1, 'mano viste el estado de emilia?', '2026-03-12 05:02:00', 1),
(86, 2, 10, 'Mano no ', '2026-03-12 05:02:04', 1),
(87, 2, 10, 'Ali', '2026-03-12 05:14:57', 1),
(88, 2, 10, 'Epa', '2026-03-12 05:15:07', 1),
(89, 2, 1, 'epa', '2026-03-12 05:16:37', 1),
(90, 2, 10, 'Ey', '2026-03-12 05:16:56', 1),
(91, 2, 10, '222333', '2026-03-12 05:17:18', 1),
(92, 2, 10, 'Xd', '2026-03-12 05:20:54', 1),
(93, 2, 1, 'alo', '2026-03-12 05:21:27', 1),
(94, 2, 10, 'Alo', '2026-03-12 05:22:42', 1),
(95, 2, 1, 'alo', '2026-03-12 05:22:51', 1),
(96, 2, 10, 'Xd', '2026-03-12 05:22:56', 1),
(97, 2, 10, 'Alo', '2026-03-12 05:23:23', 1),
(98, 2, 10, 'As', '2026-03-12 05:23:34', 1),
(99, 2, 10, '22', '2026-03-12 05:23:39', 1),
(100, 2, 10, 'Zd', '2026-03-12 05:25:16', 1),
(101, 2, 10, 'Xd', '2026-03-12 05:30:17', 1),
(102, 2, 10, 'Xe', '2026-03-12 05:30:40', 1),
(103, 2, 10, 'Ali', '2026-03-12 05:30:46', 1),
(104, 2, 1, 'alo', '2026-03-12 05:30:53', 1),
(105, 2, 10, 'Oye', '2026-03-12 05:31:26', 1),
(106, 2, 1, 'muelde', '2026-03-12 05:36:17', 1),
(107, 2, 10, 'Dímelo ', '2026-03-12 05:36:31', 1),
(108, 2, 10, 'Q fue ', '2026-03-12 05:36:52', 1),
(109, 2, 1, 'lq', '2026-03-12 05:37:06', 1),
(110, 3, 6, 'perra', '2026-03-12 05:37:51', 1),
(111, 2, 10, 'Alo ', '2026-03-12 05:38:12', 1),
(112, 3, 6, 'ey', '2026-03-12 05:38:17', 1),
(113, 3, 6, ' fue', '2026-03-12 05:38:23', 1),
(114, 2, 10, 'Xd', '2026-03-12 05:38:28', 1),
(115, 2, 1, 'muelde', '2026-03-12 05:39:29', 1),
(116, 3, 1, 'joan', '2026-03-12 05:39:41', 1),
(117, 2, 10, 'Mera sabes que debes ir a comprar el pollo de mañana que no se te olvide ', '2026-03-12 05:40:47', 1),
(118, 2, 10, 'Xd', '2026-03-12 05:42:50', 1),
(119, 2, 10, 'Oye', '2026-03-12 05:43:07', 1),
(120, 2, 10, 'Xd', '2026-03-12 05:43:17', 1),
(121, 3, 6, 'Alo', '2026-03-12 05:55:38', 1),
(122, 3, 6, 'Q fue ', '2026-03-12 05:55:54', 1),
(123, 3, 6, 'Alo', '2026-03-12 05:56:31', 1),
(124, 3, 6, 'Xd', '2026-03-12 05:56:46', 1),
(125, 3, 6, 'Joan ', '2026-03-12 05:56:55', 1),
(126, 3, 6, 'Xd', '2026-03-12 05:57:36', 1),
(127, 3, 6, 'Joan ? ', '2026-03-12 05:57:49', 1),
(128, 3, 6, 'Xd', '2026-03-12 05:57:54', 1),
(129, 3, 6, 'Alo', '2026-03-12 05:58:10', 1),
(130, 2, 10, 'Cesar', '2026-03-12 05:58:55', 1),
(131, 2, 10, 'Xd ', '2026-03-12 05:59:35', 1),
(132, 2, 10, 'Xd', '2026-03-12 06:00:39', 1),
(133, 2, 10, 'Xd', '2026-03-12 06:00:52', 1),
(134, 2, 10, 'Mera', '2026-03-12 06:01:03', 1),
(135, 3, 6, 'perre', '2026-03-12 06:02:58', 1),
(136, 3, 6, 'Xd', '2026-03-12 06:05:51', 1),
(137, 3, 6, 'Cesar', '2026-03-12 06:18:56', 1),
(138, 2, 10, 'loco', '2026-03-12 06:19:20', 1),
(139, 3, 6, 'Mera', '2026-03-12 06:19:57', 1),
(140, 3, 1, 'que fue', '2026-03-12 06:20:03', 1),
(141, 3, 6, 'Nada ', '2026-03-12 06:20:08', 1),
(142, 3, 1, 'como que nada_', '2026-03-12 06:20:14', 1),
(143, 3, 6, 'alo', '2026-03-13 05:14:50', 1),
(144, 3, 6, 'alo', '2026-03-13 05:15:03', 1),
(145, 3, 6, 'alo', '2026-03-13 05:19:34', 1),
(146, 3, 6, 'alo', '2026-03-13 05:19:51', 1),
(147, 3, 6, 'xd', '2026-03-13 05:19:54', 1),
(148, 3, 6, 'alo', '2026-03-13 05:21:28', 1),
(149, 3, 6, 'xd', '2026-03-13 05:21:32', 1),
(150, 3, 6, 'alo', '2026-03-13 05:24:18', 1),
(151, 3, 6, 'qlq', '2026-03-13 05:30:57', 1),
(152, 3, 6, 'alo', '2026-03-13 05:32:14', 1),
(153, 3, 6, 'alo', '2026-03-13 05:33:50', 1),
(154, 3, 6, 'alo', '2026-03-13 05:34:18', 1),
(155, 3, 6, 'alo', '2026-03-13 05:34:21', 1),
(156, 3, 6, 'xd', '2026-03-13 05:34:27', 1),
(157, 3, 6, 'alo', '2026-03-13 05:34:36', 1),
(158, 3, 6, 'alo', '2026-03-13 05:34:45', 1),
(159, 3, 6, 'alo', '2026-03-13 05:34:51', 1),
(160, 3, 6, 'alo', '2026-03-13 05:38:30', 1),
(161, 3, 6, 's', '2026-03-13 05:38:32', 1),
(162, 3, 6, 'ss', '2026-03-13 05:38:35', 1),
(163, 3, 6, 'alo', '2026-03-13 05:38:49', 1),
(164, 3, 6, 'alo', '2026-03-13 05:40:50', 1),
(165, 3, 6, 'xd', '2026-03-13 05:40:52', 1),
(166, 3, 6, 'alo', '2026-03-13 05:42:41', 1),
(167, 3, 6, 'xd', '2026-03-13 05:42:43', 1),
(168, 3, 6, 'siuu', '2026-03-13 05:42:46', 1),
(169, 3, 6, 'mera', '2026-03-13 05:43:27', 1),
(170, 3, 6, 'perre', '2026-03-13 05:43:44', 1),
(171, 3, 6, 'xd', '2026-03-13 05:43:47', 1),
(172, 2, 1, 'a', '2026-03-13 05:44:20', 1),
(173, 2, 1, 'xd', '2026-03-13 05:49:03', 1),
(174, 2, 1, 'habla', '2026-03-13 05:49:15', 1),
(175, 2, 1, 'xd', '2026-03-13 05:50:04', 1),
(176, 2, 1, 'x', '2026-03-13 05:51:14', 1),
(177, 2, 1, 'alo', '2026-03-13 05:52:56', 1),
(178, 2, 1, 'xd', '2026-03-13 05:53:04', 1),
(179, 3, 6, 'dime', '2026-03-13 05:57:23', 1),
(180, 3, 6, 'xd', '2026-03-13 05:59:50', 1),
(181, 3, 6, 'xd', '2026-03-13 06:00:36', 1),
(182, 2, 1, 'alo', '2026-03-13 06:00:52', 1),
(183, 2, 1, 'alo', '2026-03-13 06:01:31', 1),
(184, 2, 1, 'as', '2026-03-13 06:01:33', 1),
(185, 2, 1, 'cesar', '2026-03-13 06:01:42', 1),
(186, 2, 1, 'cesar', '2026-03-13 06:01:45', 1),
(187, 2, 1, 'HOLA mi nombre es cesar y tengo 40 a;os y no se ue decir para que le texto sea muy largo siuuuu', '2026-03-13 06:26:34', 1),
(188, 3, 1, 'alo', '2026-03-16 14:03:10', 1),
(189, 3, 1, 'uqe haces?', '2026-03-16 14:03:22', 1),
(190, 3, 1, 'te gustom?', '2026-03-16 14:03:36', 1),
(191, 3, 1, 'jjajjajaa', '2026-03-16 14:04:02', 1),
(192, 3, 1, 'por q', '2026-03-16 14:05:25', 1),
(193, 3, 6, 'Umjummm por nada', '2026-03-16 14:05:47', 1),
(194, 3, 6, 'Solo te pregunté ', '2026-03-16 14:06:04', 1),
(195, 3, 1, 'xd', '2026-03-16 14:06:49', 1),
(196, 2, 1, 'Solicitud de ajuste en el campo \"justificacion\": esa justificacion es baga. Valor actual: 123\n', '2026-03-18 19:22:19', 1),
(197, 2, 10, 'hola perro', '2026-03-18 19:24:26', 1),
(198, 2, 10, 'xd', '2026-03-18 19:24:34', 1),
(199, 2, 10, 'alo', '2026-03-18 19:26:54', 1),
(200, 2, 1, 'Alo', '2026-03-22 05:57:04', 1),
(201, 2, 1, 'Xd', '2026-03-22 05:57:16', 1),
(202, 2, 1, 'Ajuste en \"resumen\": mano esto es serio xd. Valor actual: condones', '2026-03-25 03:33:36', 1),
(203, 3, 1, 'sexo?', '2026-03-25 13:49:41', 1),
(204, 3, 6, 'No', '2026-03-25 13:49:44', 1),
(205, 3, 1, 'pero', '2026-03-25 13:49:49', 1),
(206, 3, 6, 'No se une. Bien', '2026-03-25 13:50:03', 1),
(207, 3, 1, 'y esi?', '2026-03-25 13:50:14', 1),
(208, 3, 6, 'No', '2026-03-25 13:50:19', 1),
(209, 3, 1, 'ohhh', '2026-03-25 13:50:24', 1),
(210, 3, 6, 'Que haces ?', '2026-03-25 13:50:30', 1),
(211, 3, 1, 'nada sapo y tu?', '2026-03-25 13:50:39', 1),
(212, 2, 1, 'Escucha la justificación me parece muy baga si la puedes mejorar ', '2026-03-29 00:13:44', 1),
(213, 3, 1, 'Alo', '2026-03-29 19:58:36', 1),
(214, 3, 1, 'Jejeje ', '2026-03-29 19:58:47', 1),
(215, 3, 6, 'nps', '2026-03-29 19:58:53', 1),
(216, 3, 1, 'Alo ', '2026-03-29 19:59:12', 1),
(217, 3, 6, 'xd', '2026-03-29 19:59:18', 1),
(218, 3, 1, 'Si', '2026-03-29 20:01:01', 1),
(219, 3, 1, 'Alo', '2026-03-29 20:15:39', 1),
(220, 3, 1, 'Xd ', '2026-03-29 20:15:52', 1),
(221, 3, 1, 'Alo', '2026-03-29 20:16:05', 1),
(222, 3, 6, 'xd', '2026-03-29 20:16:23', 1),
(223, 3, 1, 'Xd', '2026-03-29 20:16:28', 1),
(224, 3, 6, 'xd', '2026-03-29 20:22:40', 1),
(225, 3, 6, 'xd', '2026-03-29 20:22:43', 1),
(226, 3, 1, 'Xd', '2026-03-29 20:22:47', 1),
(227, 3, 6, 'xd', '2026-03-29 20:23:37', 1),
(228, 3, 6, 'pero', '2026-03-29 20:23:43', 1),
(229, 3, 1, 'No llega', '2026-03-29 20:23:54', 1),
(230, 3, 1, 'Si? ', '2026-03-29 20:28:14', 1),
(231, 3, 1, 'alo', '2026-03-29 20:30:15', 1),
(232, 3, 1, 'per', '2026-03-29 20:31:26', 1),
(233, 3, 1, 'alo', '2026-03-29 20:32:43', 1),
(234, 3, 1, 'xd', '2026-03-29 20:32:45', 1),
(235, 3, 6, 'Zd', '2026-03-29 20:33:17', 1),
(236, 3, 6, 'Alo', '2026-03-29 20:46:05', 1),
(237, 3, 6, 'Alo', '2026-03-29 20:47:53', 1),
(238, 3, 6, 'Si carga ? ', '2026-03-29 20:48:02', 1),
(239, 3, 6, 'No', '2026-03-29 20:48:06', 1),
(240, 3, 1, 'si', '2026-03-29 20:49:12', 1),
(241, 3, 6, 'No', '2026-03-29 20:49:17', 1),
(242, 3, 6, 'Xd', '2026-03-29 21:05:45', 1),
(243, 3, 6, 'Si ', '2026-03-29 21:05:53', 1),
(244, 3, 1, 'jajsaja', '2026-03-29 21:06:00', 1),
(245, 3, 6, 'Alo', '2026-03-29 21:09:01', 1),
(246, 3, 6, 'Ok', '2026-03-29 21:09:24', 1),
(247, 3, 6, 'Si', '2026-03-29 21:09:43', 1),
(248, 2, 1, 'xd\'', '2026-03-29 21:11:46', 1),
(249, 3, 6, 'Ola', '2026-03-29 21:11:52', 1),
(250, 3, 6, 'Ss', '2026-03-29 21:12:02', 1),
(251, 3, 1, 'kl', '2026-03-29 21:12:07', 1),
(252, 3, 6, 'Si', '2026-03-29 21:12:19', 1),
(253, 3, 6, 'No', '2026-03-29 21:26:37', 1),
(254, 3, 6, 'No', '2026-03-29 21:26:43', 1),
(255, 2, 1, 'no', '2026-03-29 21:27:03', 1),
(256, 3, 6, 'No', '2026-03-29 21:27:06', 1),
(257, 3, 6, 'Ei', '2026-03-29 21:27:15', 1),
(258, 3, 6, 'No', '2026-03-29 21:27:29', 1),
(259, 3, 6, 'Al9', '2026-03-29 22:07:01', 1),
(260, 3, 6, 'Alo', '2026-03-29 22:07:56', 1),
(261, 3, 6, 'Ey', '2026-03-29 22:11:20', 1),
(262, 3, 6, 'Xd', '2026-03-29 22:11:28', 1),
(263, 3, 6, 'Xd', '2026-03-29 22:11:34', 1),
(264, 3, 6, 'Cg', '2026-03-29 22:11:40', 1),
(265, 3, 6, 'Xd', '2026-03-29 22:11:58', 1),
(266, 3, 6, 'Alo', '2026-03-29 22:12:18', 1),
(267, 3, 6, 'Al9', '2026-03-29 22:12:39', 1),
(268, 3, 6, 'Ey', '2026-03-29 22:16:28', 1),
(269, 3, 1, 'q', '2026-03-29 22:16:49', 1),
(270, 3, 6, 'E', '2026-03-29 22:17:09', 1),
(271, 3, 1, 'o', '2026-03-29 22:17:12', 1),
(272, 3, 1, 'xd', '2026-03-29 22:17:30', 1),
(273, 3, 1, ' pero', '2026-03-29 22:17:38', 1),
(274, 3, 6, 'No', '2026-03-29 22:17:42', 1),
(275, 3, 6, 'ey', '2026-03-29 22:18:42', 1),
(276, 3, 1, 'No', '2026-03-29 22:19:07', 1),
(277, 2, 1, 'No llega ', '2026-03-29 22:20:29', 1),
(278, 3, 6, 'No llega ', '2026-03-29 22:21:35', 1),
(279, 3, 1, 'aui si', '2026-03-29 22:21:44', 1),
(280, 3, 6, 'Si', '2026-03-29 22:22:21', 1),
(281, 3, 1, 'no', '2026-03-29 22:22:50', 1),
(282, 3, 1, 'xd', '2026-03-29 22:22:54', 1),
(283, 3, 6, 'Pero weno ', '2026-03-29 22:22:58', 1),
(284, 3, 1, 'j', '2026-03-29 22:23:02', 1),
(285, 3, 1, 'si', '2026-03-29 22:23:09', 1),
(286, 3, 6, 'No', '2026-03-29 22:23:15', 1),
(287, 3, 1, 'no', '2026-03-29 22:23:19', 1),
(288, 3, 1, 'mo', '2026-03-29 22:23:21', 1),
(289, 3, 1, 'ey', '2026-03-29 22:24:52', 1),
(290, 3, 1, 'q fue', '2026-03-29 22:24:57', 1),
(291, 3, 6, 'Njd', '2026-03-29 22:25:01', 1),
(292, 3, 6, 'Alo', '2026-03-29 22:26:05', 1),
(293, 3, 1, 'nada', '2026-03-29 22:26:12', 1),
(294, 3, 6, 'S', '2026-03-29 22:26:32', 1),
(295, 3, 6, 'Xd', '2026-03-29 22:26:48', 1),
(296, 3, 6, 'Si', '2026-03-29 22:27:58', 1),
(297, 3, 6, 'Alo', '2026-03-29 22:28:14', 1),
(298, 3, 1, 'fino', '2026-03-29 22:28:19', 1),
(299, 3, 1, 'njd', '2026-03-29 22:28:22', 1),
(300, 3, 6, 'Q fue ', '2026-03-29 22:28:28', 1),
(301, 3, 1, 'dime tu', '2026-03-29 22:28:34', 1),
(302, 3, 1, 'c', '2026-03-29 22:28:47', 1),
(303, 3, 6, 'Q paso ', '2026-03-29 22:29:00', 1),
(304, 3, 1, 'no se', '2026-03-29 22:29:04', 1),
(305, 3, 1, 'ummm', '2026-03-29 22:29:08', 1),
(306, 3, 1, 'ok', '2026-03-29 22:29:11', 1),
(307, 3, 1, 'oye\'', '2026-03-29 22:29:20', 1),
(308, 3, 6, 'Dime', '2026-03-29 22:29:27', 1),
(309, 3, 1, 'nada', '2026-03-29 22:29:30', 1),
(310, 3, 6, 'Si', '2026-03-29 22:33:52', 1),
(311, 3, 6, 'No reacciona ', '2026-03-29 22:33:59', 1),
(312, 3, 6, 'Y ahora ? ', '2026-03-29 22:34:17', 1),
(313, 3, 6, 'Menos ', '2026-03-29 22:34:21', 1),
(314, 3, 1, 'xd', '2026-03-29 22:34:30', 1),
(315, 3, 1, 'si', '2026-03-29 22:34:37', 1),
(316, 3, 6, 'Nahhh', '2026-03-29 22:34:43', 1),
(317, 3, 6, 'Siu', '2026-03-29 22:35:08', 1),
(318, 3, 1, 'xd', '2026-03-29 22:35:18', 1),
(319, 3, 6, 'Ss', '2026-03-29 22:35:21', 1),
(320, 3, 1, 'xd', '2026-03-29 22:40:53', 1),
(321, 3, 1, 'si', '2026-03-29 22:41:13', 1),
(322, 3, 1, 'hablame', '2026-03-29 22:41:41', 1),
(323, 3, 6, 'Jejejeje', '2026-03-29 22:41:45', 1),
(324, 3, 1, 'mera', '2026-03-29 23:05:04', 1),
(325, 3, 6, 'Dime', '2026-03-29 23:05:15', 1),
(326, 2, 1, 'Ajuste en \"justificacion\": En donde dices que es necesario no consta ya no me importa. Valor actual: El torno que posee mantenimiento esta en deterioro por lo tanto solicitamos mediante la presenta un nuevo torno', '2026-03-30 05:36:25', 1),
(327, 3, 6, 'Alo', '2026-04-06 03:14:21', 0),
(329, 2, 1, 'Ajuste en \"monto_estimado\": este monto no va deacode a lo esoeradi resugne su propuesta. Valor actual: 676000.00', '2026-04-06 03:56:13', 1),
(330, 2, 10, 'Omg ', '2026-04-06 03:57:21', 1),
(331, 2, 10, 'Pero si ese es el precio loco', '2026-04-06 03:57:38', 1),
(332, 2, 10, 'Sexo con Rosanne ', '2026-04-06 03:57:49', 1),
(333, 4, 12, 'Ajuste en \"justificacion\": alo. Valor actual: El torno que posee mantenimiento esta en deterioro por lo tanto solicitamos mediante la presenta un nuevo torno', '2026-04-06 13:55:56', 0),
(334, 2, 1, 'Ajuste en \"justificacion\": la justificacion es baga. Valor actual: El torno que posee mantenimiento esta en deterioro por lo tanto solicitamos mediante la presenta un nuevo torno', '2026-04-13 15:19:59', 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `notificaciones`
--

CREATE TABLE `notificaciones` (
  `id_notificacion` int(11) NOT NULL,
  `id_solicitud` int(11) DEFAULT NULL,
  `contenido` text NOT NULL,
  `status` enum('error','ok','info','advertencia') DEFAULT 'ok',
  `fecha` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `notificaciones`
--

INSERT INTO `notificaciones` (`id_notificacion`, `id_solicitud`, `contenido`, `status`, `fecha`) VALUES
(0, 9, 'Tu solicitud \"23\" ha sido Aprobado.', 'ok', '2026-03-29 23:06:10'),
(0, 34, 'Tu solicitud \"Nevera\" ha sido Aprobado.', 'ok', '2026-03-29 23:08:43'),
(0, 35, 'Tu solicitud \"Laptop hp\" ha sido Rechazado.', 'error', '2026-03-29 23:46:28'),
(0, 35, 'Tu solicitud \"Laptop hp\" ha sido Rechazado.', 'error', '2026-04-06 04:50:44'),
(0, 35, 'Tu solicitud \"Laptop hp\" ha sido Aprobado.', 'ok', '2026-04-06 13:55:22');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `notificaciones_not_solisitud`
--

CREATE TABLE `notificaciones_not_solisitud` (
  `id_not_soli` int(11) NOT NULL,
  `id_gerencia` int(11) NOT NULL,
  `contenido` text NOT NULL,
  `status` enum('error','ok','info','warning') DEFAULT 'warning',
  `fecha` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `notificaciones_not_solisitud`
--

INSERT INTO `notificaciones_not_solisitud` (`id_not_soli`, `id_gerencia`, `contenido`, `status`, `fecha`) VALUES
(1, 5, 'Queda solo el -2.9% del presupuesto. Disponible: $-10.000', 'warning', '2026-03-29 23:31:55'),
(2, 6, 'Queda solo el 15.5% del presupuesto. Disponible: $124.000', 'warning', '2026-03-29 23:31:55');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id_producto` int(11) NOT NULL,
  `codigo_producto` varchar(50) NOT NULL,
  `nombre_producto` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `id_categoria` int(11) DEFAULT NULL,
  `stock_minimo` int(11) DEFAULT 0,
  `stock_actual` int(11) DEFAULT 0,
  `id_unidad` int(11) DEFAULT NULL,
  `precio_unitario` decimal(10,2) DEFAULT NULL,
  `id_gerencia` int(11) DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id_producto`, `codigo_producto`, `nombre_producto`, `descripcion`, `id_categoria`, `stock_minimo`, `stock_actual`, `id_unidad`, `precio_unitario`, `id_gerencia`, `fecha_creacion`) VALUES
(16, '3010', 'Licencia office', 'Licencia para poder usar todos los servicios de Microsoft Office', 11, 1, 30, NULL, 9.89, 5, '2026-03-30 06:29:49'),
(17, '9087', 'Laptop Dell', 'Dispositivo portátil marca Dell', 11, 1, 5, NULL, 230.00, 1, '2026-03-30 06:29:49');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `id_rol` int(11) NOT NULL,
  `nombre_rol` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`id_rol`, `nombre_rol`) VALUES
(1, 'administrador'),
(3, 'cliente'),
(2, 'personal'),
(5, 'SuperAdministrador'),
(4, 'usuario');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `solicitudes_compra`
--

CREATE TABLE `solicitudes_compra` (
  `id_solicitud` int(11) NOT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `id_gerencia` int(11) DEFAULT NULL,
  `resumen` varchar(100) NOT NULL,
  `justificacion` text NOT NULL,
  `prioridad` enum('Baja','Media','Alta') DEFAULT 'Media',
  `estado` enum('Borrador','Pendiente','Aprobado','Rechazado') DEFAULT 'Pendiente',
  `monto_estimado` decimal(12,2) DEFAULT NULL,
  `id_solicitante` int(10) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `solicitudes_compra`
--

INSERT INTO `solicitudes_compra` (`id_solicitud`, `fecha_creacion`, `id_gerencia`, `resumen`, `justificacion`, `prioridad`, `estado`, `monto_estimado`, `id_solicitante`) VALUES
(3, '2026-01-28 05:42:53', 2, 'Laptop HP', 'COMPRA de laptop para el nuevo integrande de informatica', 'Media', 'Aprobado', 2323.00, 1),
(5, '2026-01-28 05:44:31', 2, 'Botas de Seguridad', 'la seguridad es lo mas primordial para el tebajador por eso las botas de seguridad es un elemento fundamental para si proteccion\r\n', 'Media', 'Rechazado', 42.00, 10),
(9, '2026-01-28 06:25:03', 1, '23', '32', 'Media', 'Aprobado', 122.00, 6),
(11, '2026-01-28 06:28:28', 1, 'Prueba Unica', 'Esta no debe duplicarse', 'Media', 'Aprobado', 442.00, 1),
(12, '2026-02-04 16:32:11', 2, '123', '21212', 'Media', 'Aprobado', 233.00, 1),
(13, '2026-02-05 01:11:49', 1, 'laptop hp', 'I5 DE 11TH GENERACION', 'Media', 'Aprobado', 1000.00, 1),
(14, '2026-02-05 01:16:30', 1, 'Laptop hp', 'i5 11th generacion', 'Media', 'Aprobado', 902.00, 1),
(15, '2026-02-05 04:30:57', 1, 'Traje termico', 'la seguridad del trabajador es lo primero por eso la necesidad de un traje en optimas condiciones es crucial para su protecion de acuerdo al articulo 4 de la ley organica del trabajo', 'Media', 'Aprobado', 0.00, 1),
(16, '2026-02-18 23:09:36', 1, 'toyota', 'Tacoma', 'Media', 'Rechazado', 3000.00, 10),
(17, '2026-02-18 23:18:38', 1, '12', '22', 'Media', 'Aprobado', 22.00, 10),
(18, '2026-02-18 23:26:17', 1, '123', '4321', 'Media', 'Aprobado', 35.00, 10),
(19, '2026-02-18 23:28:11', 1, '1234', '422', 'Media', 'Aprobado', 666.00, 10),
(20, '2026-02-18 23:28:13', 1, '1234', '422', 'Media', 'Aprobado', 666.00, 10),
(21, '2026-03-13 04:22:41', 1, 'compra', '123\n', 'Media', 'Rechazado', 22.00, 1),
(22, '2026-03-13 04:22:42', 1, 'compra', '123\n', 'Media', 'Rechazado', 22.00, 1),
(23, '2026-03-13 04:48:24', 1, '2', '2', 'Media', 'Aprobado', 2.00, 1),
(24, '2026-03-19 01:08:22', 1, 'CABLES', 'SI', 'Media', 'Aprobado', 1220.00, 6),
(25, '2026-03-25 03:21:15', 1, 'Carro', 'Por que si', 'Media', 'Pendiente', 40000.00, 1),
(26, '2026-03-25 03:21:19', 1, 'Carro', 'Por que si', 'Media', 'Aprobado', 40000.00, 1),
(27, '2026-03-25 03:24:03', 1, 'algo', '22', 'Media', 'Aprobado', 22.00, 1),
(28, '2026-03-25 03:26:46', 1, 'iphone', 'por que si ', 'Media', 'Aprobado', 2000.00, 1),
(29, '2026-03-25 03:27:32', 1, 'Biclicleta', 'cdd', 'Media', 'Rechazado', 200.00, 1),
(30, '2026-03-25 03:31:40', 1, 'Titulo', 'Sexo', 'Media', 'Aprobado', 20000.00, 1),
(31, '2026-03-25 03:32:47', 1, 'condones', 'para el sida', 'Media', 'Aprobado', 200.00, 1),
(32, '2026-03-29 07:33:08', 5, 'Tanque de Gasolina', 'Como hemos tenido problemas con el suministro electrico seria buena idea guardar gasolina para el generador electrico', 'Media', 'Aprobado', 360000.00, 1),
(33, '2026-03-29 07:50:10', 6, 'Torno', 'El torno que posee mantenimiento esta en deterioro por lo tanto solicitamos mediante la presenta un nuevo torno', 'Media', 'Pendiente', 676000.00, 1),
(34, '2026-03-29 23:07:05', 1, 'Nevera', 'Para nantener frias las Polarsitas', 'Media', 'Aprobado', 4000.00, 6),
(35, '2026-03-29 23:46:05', 1, 'Laptop hp', 'Para poder gestionar informacion de manera mas eficiente', 'Media', 'Aprobado', 4000.00, 6),
(36, '2026-04-03 02:00:27', 1, '12333', '333', 'Baja', 'Aprobado', 1000.00, 6);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `unidades_medida`
--

CREATE TABLE `unidades_medida` (
  `id_unidad` int(11) NOT NULL,
  `nombre_unidad` varchar(50) NOT NULL,
  `abreviatura` varchar(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `unidades_medida`
--

INSERT INTO `unidades_medida` (`id_unidad`, `nombre_unidad`, `abreviatura`) VALUES
(1, 'Metro', 'M'),
(2, 'Litros', 'L'),
(3, 'Unidad', 'UND'),
(4, '', 'PQT');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id_usuario` int(10) UNSIGNED NOT NULL,
  `username` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `id_rol` int(11) NOT NULL,
  `id_gerencia` int(11) DEFAULT NULL,
  `nombres` varchar(100) DEFAULT NULL,
  `apellidos` varchar(100) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT 'avatar-1.png',
  `sexo` varchar(10) DEFAULT NULL,
  `telf` varchar(20) DEFAULT NULL,
  `direccion` text DEFAULT NULL,
  `cedula` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id_usuario`, `username`, `email`, `password`, `id_rol`, `id_gerencia`, `nombres`, `apellidos`, `avatar`, `sexo`, `telf`, `direccion`, `cedula`) VALUES
(1, 'Leo17k', 'esteysertorres2@gmail.com', '$2a$10$tXpn50VNQ14ktdDOw51cyuWkCbetgjEmV29Kjh03SfzitOqY.ZOzS', 5, 5, 'Cesar Alejandro', 'Torres Nuñez', '608648896_1589026689201868_291608303146887053_n.jpg', 'Masculino', '04128746822', 'Venezuela ,Bolívar ,Ciudad Bolívar, Parroquia La Sabanita, Sector Las Piedritas, Calle Páez, Casa 1456', '30939693'),
(6, 'Kely', 'joanquelis08@gmail.com', '$2a$12$IwOIiAP4mJ2MwDwIlbL5mu5T9CacdQOCAzCzLhBDRP4kIE/BEh.5C', 4, 1, 'Joanquelis Karolina', 'Torres Nuñez', '484539495_1613413199542517_608959181159966383_n.jpg', 'Femenino', '04128746822', 'Venezuela ,Bolívar ,Ciudad Bolívar, Parroquia La Sabanita, Sector Las Piedritas, Calle Páez, Casa 1456', ''),
(10, 'Samuel12', 'samuel12@gmail.com', '$2a$12$IwOIiAP4mJ2MwDwIlbL5mu5T9CacdQOCAzCzLhBDRP4kIE/BEh.5C', 4, 2, 'Samuel Jose', 'Torres ', '611959106_1530565924905183_2664705262971466847_n.jpg', 'Masculino', '04128746822', 'Su casa', ''),
(12, 'Carlos12', 'esteysertorres@gmail.com', '$2a$12$IwOIiAP4mJ2MwDwIlbL5mu5T9CacdQOCAzCzLhBDRP4kIE/BEh.5C', 1, 1, 'Carlos', 'Torres', 'wwdc-glowing-violet-6016x3384-19118', 'Masculino', '04265930041', NULL, '12186601'),
(14, 'naelis2', 'esuyr@gmail.com', '$2b$12$alo8z0g9QnBDAITVLfr5Yuw3idN93UNuRxxcJ2L89UevHvptUaPVm', 4, 2, 'Naelis', 'Cedeños', 'avatar-1.png', 'Masculino', '0291992900', NULL, '199201011'),
(15, 'lui17', 'laya@gmail.com', '$2b$12$VQSbARfLow5lIicW0W.lFOQ1AlfAbtK27f2hmke2iBpBY6.tmwrF.', 4, 6, 'Luiz', 'Laya', 'avatar-1.png', 'Masculino', '399992', NULL, '234233222'),
(16, 'lui1', 'elui@gmail.com', '$2b$12$ti8urCjqnfukWjJzdt5tNuVkVBN8phwSdh.9BFEZqt1VaBNwig9oG', 4, 2, 'lui1', 'laya1', 'avatar-1.png', 'Masculino', '04123999', NULL, '30292921'),
(23, 'cesar1', 'esteysertorres22@gmail.com', '$2b$12$Udz1c7aCY4sCIMjeMvAR3uszuZFzbP8q5vnCTbaKSmMCMvlldQkJq', 4, 5, 'cesar', 'torres', 'avatar-1.png', 'Masculino', '0100011', NULL, '3001991');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `categorias`
--
ALTER TABLE `categorias`
  ADD PRIMARY KEY (`id_categoria`);

--
-- Indices de la tabla `centro_costo`
--
ALTER TABLE `centro_costo`
  ADD PRIMARY KEY (`id_centro_costo`),
  ADD KEY `id_gerencia` (`id_gerencia`);

--
-- Indices de la tabla `chats`
--
ALTER TABLE `chats`
  ADD PRIMARY KEY (`id_chat`),
  ADD KEY `fk_chat_solicitud` (`id_solicitud`);

--
-- Indices de la tabla `chat_participantes`
--
ALTER TABLE `chat_participantes`
  ADD PRIMARY KEY (`id_chat`,`id_usuario`),
  ADD KEY `id_usuario` (`id_usuario`);

--
-- Indices de la tabla `detalles_solicitud`
--
ALTER TABLE `detalles_solicitud`
  ADD PRIMARY KEY (`id_detalle`),
  ADD KEY `id_solicitud` (`id_solicitud`);

--
-- Indices de la tabla `gerencias`
--
ALTER TABLE `gerencias`
  ADD PRIMARY KEY (`id_gerencia`),
  ADD UNIQUE KEY `uc_codigo` (`codigo`);

--
-- Indices de la tabla `historial_estados`
--
ALTER TABLE `historial_estados`
  ADD PRIMARY KEY (`id_historial`),
  ADD KEY `id_solicitud` (`id_solicitud`);

--
-- Indices de la tabla `inventario_movimientos`
--
ALTER TABLE `inventario_movimientos`
  ADD PRIMARY KEY (`id_movimiento`),
  ADD KEY `fk_inv_producto` (`id_producto`),
  ADD KEY `fk_inv_usuario` (`id_usuario`),
  ADD KEY `fk_inv_solicitud` (`id_solicitud`);

--
-- Indices de la tabla `mensajes`
--
ALTER TABLE `mensajes`
  ADD PRIMARY KEY (`id_mensaje`),
  ADD KEY `id_chat` (`id_chat`),
  ADD KEY `id_emisor` (`id_emisor`);

--
-- Indices de la tabla `notificaciones`
--
ALTER TABLE `notificaciones`
  ADD KEY `notificacion-solit` (`id_solicitud`);

--
-- Indices de la tabla `notificaciones_not_solisitud`
--
ALTER TABLE `notificaciones_not_solisitud`
  ADD PRIMARY KEY (`id_not_soli`),
  ADD KEY `fk_not_soli_gerencia` (`id_gerencia`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id_producto`),
  ADD UNIQUE KEY `codigo_producto` (`codigo_producto`),
  ADD KEY `id_categoria` (`id_categoria`),
  ADD KEY `id_gerencia` (`id_gerencia`),
  ADD KEY `fk_unidad_medida` (`id_unidad`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id_rol`),
  ADD UNIQUE KEY `nombre_rol` (`nombre_rol`);

--
-- Indices de la tabla `solicitudes_compra`
--
ALTER TABLE `solicitudes_compra`
  ADD PRIMARY KEY (`id_solicitud`),
  ADD KEY `fk_gerencia` (`id_gerencia`),
  ADD KEY `fk_usuario_solicitante` (`id_solicitante`);

--
-- Indices de la tabla `unidades_medida`
--
ALTER TABLE `unidades_medida`
  ADD PRIMARY KEY (`id_unidad`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `nombre_usuario` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `fk_id_rol` (`id_rol`),
  ADD KEY `fk_usuario_gerencia` (`id_gerencia`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `categorias`
--
ALTER TABLE `categorias`
  MODIFY `id_categoria` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT de la tabla `centro_costo`
--
ALTER TABLE `centro_costo`
  MODIFY `id_centro_costo` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `chats`
--
ALTER TABLE `chats`
  MODIFY `id_chat` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `detalles_solicitud`
--
ALTER TABLE `detalles_solicitud`
  MODIFY `id_detalle` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `gerencias`
--
ALTER TABLE `gerencias`
  MODIFY `id_gerencia` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT de la tabla `historial_estados`
--
ALTER TABLE `historial_estados`
  MODIFY `id_historial` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `inventario_movimientos`
--
ALTER TABLE `inventario_movimientos`
  MODIFY `id_movimiento` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `mensajes`
--
ALTER TABLE `mensajes`
  MODIFY `id_mensaje` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=335;

--
-- AUTO_INCREMENT de la tabla `notificaciones_not_solisitud`
--
ALTER TABLE `notificaciones_not_solisitud`
  MODIFY `id_not_soli` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id_producto` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT de la tabla `roles`
--
ALTER TABLE `roles`
  MODIFY `id_rol` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `solicitudes_compra`
--
ALTER TABLE `solicitudes_compra`
  MODIFY `id_solicitud` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT de la tabla `unidades_medida`
--
ALTER TABLE `unidades_medida`
  MODIFY `id_unidad` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id_usuario` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `centro_costo`
--
ALTER TABLE `centro_costo`
  ADD CONSTRAINT `centro_costo_ibfk_1` FOREIGN KEY (`id_gerencia`) REFERENCES `gerencias` (`id_gerencia`);

--
-- Filtros para la tabla `chats`
--
ALTER TABLE `chats`
  ADD CONSTRAINT `fk_chat_solicitud` FOREIGN KEY (`id_solicitud`) REFERENCES `solicitudes_compra` (`id_solicitud`) ON DELETE CASCADE;

--
-- Filtros para la tabla `chat_participantes`
--
ALTER TABLE `chat_participantes`
  ADD CONSTRAINT `chat_participantes_ibfk_1` FOREIGN KEY (`id_chat`) REFERENCES `chats` (`id_chat`) ON DELETE CASCADE,
  ADD CONSTRAINT `chat_participantes_ibfk_2` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE;

--
-- Filtros para la tabla `detalles_solicitud`
--
ALTER TABLE `detalles_solicitud`
  ADD CONSTRAINT `detalles_solicitud_ibfk_1` FOREIGN KEY (`id_solicitud`) REFERENCES `solicitudes_compra` (`id_solicitud`) ON DELETE CASCADE;

--
-- Filtros para la tabla `historial_estados`
--
ALTER TABLE `historial_estados`
  ADD CONSTRAINT `historial_estados_ibfk_1` FOREIGN KEY (`id_solicitud`) REFERENCES `solicitudes_compra` (`id_solicitud`);

--
-- Filtros para la tabla `inventario_movimientos`
--
ALTER TABLE `inventario_movimientos`
  ADD CONSTRAINT `fk_inv_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_inv_solicitud` FOREIGN KEY (`id_solicitud`) REFERENCES `solicitudes_compra` (`id_solicitud`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_inv_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `mensajes`
--
ALTER TABLE `mensajes`
  ADD CONSTRAINT `mensajes_ibfk_1` FOREIGN KEY (`id_chat`) REFERENCES `chats` (`id_chat`) ON DELETE CASCADE,
  ADD CONSTRAINT `mensajes_ibfk_2` FOREIGN KEY (`id_emisor`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `notificaciones`
--
ALTER TABLE `notificaciones`
  ADD CONSTRAINT `notificacion-solit` FOREIGN KEY (`id_solicitud`) REFERENCES `solicitudes_compra` (`id_solicitud`) ON DELETE CASCADE;

--
-- Filtros para la tabla `notificaciones_not_solisitud`
--
ALTER TABLE `notificaciones_not_solisitud`
  ADD CONSTRAINT `fk_not_soli_gerencia` FOREIGN KEY (`id_gerencia`) REFERENCES `gerencias` (`id_gerencia`) ON DELETE CASCADE;

--
-- Filtros para la tabla `productos`
--
ALTER TABLE `productos`
  ADD CONSTRAINT `fk_unidad_medida` FOREIGN KEY (`id_unidad`) REFERENCES `unidades_medida` (`id_unidad`),
  ADD CONSTRAINT `productos_ibfk_1` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id_categoria`),
  ADD CONSTRAINT `productos_ibfk_2` FOREIGN KEY (`id_gerencia`) REFERENCES `gerencias` (`id_gerencia`);

--
-- Filtros para la tabla `solicitudes_compra`
--
ALTER TABLE `solicitudes_compra`
  ADD CONSTRAINT `fk_gerencia` FOREIGN KEY (`id_gerencia`) REFERENCES `gerencias` (`id_gerencia`),
  ADD CONSTRAINT `fk_usuario_solicitante` FOREIGN KEY (`id_solicitante`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `fk_usuario_gerencia` FOREIGN KEY (`id_gerencia`) REFERENCES `gerencias` (`id_gerencia`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_usuario_rol` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`),
  ADD CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
