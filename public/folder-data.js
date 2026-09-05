window.CODE_HEARTBEAT_TREE = {
  "name": "FolderTree",
  "path": "",
  "type": "directory",
  "children": [
    {
      "name": "DateienUndDaten",
      "path": "DateienUndDaten",
      "type": "directory",
      "children": [
        {
          "name": "CsvVerarbeiten.java",
          "path": "DateienUndDaten/CsvVerarbeiten.java",
          "type": "file",
          "content": "public class CsvVerarbeiten {\n    public static void main(String[] args) {\n        String csv = \"Name;Punkte\\nAda;95\\nLinus;88\";\n        String[] zeilen = csv.split(\"\\\\n\");\n\n        for (int index = 1; index < zeilen.length; index++) {\n            String[] spalten = zeilen[index].split(\";\");\n            System.out.println(spalten[0] + \" hat \" + spalten[1] + \" Punkte.\");\n        }\n    }\n}\n"
        },
        {
          "name": "JdbcGrundlagen.java",
          "path": "DateienUndDaten/JdbcGrundlagen.java",
          "type": "file",
          "content": "import java.sql.Connection;\nimport java.sql.PreparedStatement;\nimport java.sql.ResultSet;\nimport java.sql.SQLException;\n\npublic class JdbcGrundlagen {\n    public static void findeBenutzer(Connection verbindung, int id) throws SQLException {\n        String sql = \"SELECT name FROM benutzer WHERE id = ?\";\n\n        try (PreparedStatement anweisung = verbindung.prepareStatement(sql)) {\n            anweisung.setInt(1, id);\n            try (ResultSet ergebnis = anweisung.executeQuery()) {\n                if (ergebnis.next()) {\n                    System.out.println(ergebnis.getString(\"name\"));\n                }\n            }\n        }\n    }\n}\n"
        },
        {
          "name": "TextdateiLesenSchreiben.java",
          "path": "DateienUndDaten/TextdateiLesenSchreiben.java",
          "type": "file",
          "content": "import java.io.IOException;\nimport java.nio.file.Files;\nimport java.nio.file.Path;\n\npublic class TextdateiLesenSchreiben {\n    public static void main(String[] args) throws IOException {\n        Path datei = Files.createTempFile(\"codeheartbeat-\", \".txt\");\n        Files.writeString(datei, \"Java-Dateien sicher verarbeiten\");\n\n        String inhalt = Files.readString(datei);\n        System.out.println(\"Dateiinhalt: \" + inhalt);\n\n        Files.deleteIfExists(datei);\n    }\n}\n"
        }
      ]
    },
    {
      "name": "Fortgeschritten",
      "path": "Fortgeschritten",
      "type": "directory",
      "children": [
        {
          "name": "ExecutorServiceBeispiel.java",
          "path": "Fortgeschritten/ExecutorServiceBeispiel.java",
          "type": "file",
          "content": "import java.util.concurrent.ExecutorService;\nimport java.util.concurrent.Executors;\n\npublic class ExecutorServiceBeispiel {\n    public static void main(String[] args) {\n        ExecutorService executor = Executors.newFixedThreadPool(2);\n        executor.submit(() -> System.out.println(\"Aufgabe A\"));\n        executor.submit(() -> System.out.println(\"Aufgabe B\"));\n        executor.shutdown();\n    }\n}\n"
        },
        {
          "name": "ThreadBeispiel.java",
          "path": "Fortgeschritten/ThreadBeispiel.java",
          "type": "file",
          "content": "public class ThreadBeispiel {\n    public static void main(String[] args) throws InterruptedException {\n        Thread thread = new Thread(() -> System.out.println(\"Arbeit im zweiten Thread\"));\n        thread.start();\n        thread.join();\n\n        System.out.println(\"Hauptthread beendet.\");\n    }\n}\n"
        }
      ]
    },
    {
      "name": "Grundlagen",
      "path": "Grundlagen",
      "type": "directory",
      "children": [
        {
          "name": "Collections",
          "path": "Grundlagen/Collections",
          "type": "directory",
          "children": [
            {
              "name": "ArrayGrundlagen.java",
              "path": "Grundlagen/Collections/ArrayGrundlagen.java",
              "type": "file",
              "content": "public class ArrayGrundlagen {\n    public static void main(String[] args) {\n        int[] zahlen = {4, 8, 15, 16, 23, 42};\n\n        System.out.println(\"Erstes Element: \" + zahlen[0]);\n        System.out.println(\"Anzahl: \" + zahlen.length);\n\n        for (int zahl : zahlen) {\n            System.out.println(\"Wert: \" + zahl);\n        }\n    }\n}\n"
            },
            {
              "name": "ArrayListBeispiel.java",
              "path": "Grundlagen/Collections/ArrayListBeispiel.java",
              "type": "file",
              "content": "import java.util.ArrayList;\n\npublic class ArrayListBeispiel {\n    public static void main(String[] args) {\n        ArrayList<String> namen = new ArrayList<>();\n        namen.add(\"Ada\");\n        namen.add(\"Linus\");\n        namen.add(\"Grace\");\n\n        System.out.println(\"Zweites Element: \" + namen.get(1));\n        System.out.println(\"Anzahl: \" + namen.size());\n    }\n}\n"
            },
            {
              "name": "HashMapBeispiel.java",
              "path": "Grundlagen/Collections/HashMapBeispiel.java",
              "type": "file",
              "content": "import java.util.HashMap;\n\npublic class HashMapBeispiel {\n    public static void main(String[] args) {\n        HashMap<String, Integer> punkte = new HashMap<>();\n        punkte.put(\"Ada\", 95);\n        punkte.put(\"Linus\", 88);\n\n        System.out.println(\"Punkte von Ada: \" + punkte.get(\"Ada\"));\n        for (String name : punkte.keySet()) {\n            System.out.println(name + \": \" + punkte.get(name));\n        }\n    }\n}\n"
            },
            {
              "name": "HashSetBeispiel.java",
              "path": "Grundlagen/Collections/HashSetBeispiel.java",
              "type": "file",
              "content": "import java.util.HashSet;\n\npublic class HashSetBeispiel {\n    public static void main(String[] args) {\n        HashSet<String> sprachen = new HashSet<>();\n        sprachen.add(\"Java\");\n        sprachen.add(\"Python\");\n        sprachen.add(\"Java\");\n\n        System.out.println(\"Eindeutige Einträge: \" + sprachen.size());\n        for (String sprache : sprachen) {\n            System.out.println(\"Sprache: \" + sprache);\n        }\n    }\n}\n"
            },
            {
              "name": "IteratorBeispiel.java",
              "path": "Grundlagen/Collections/IteratorBeispiel.java",
              "type": "file",
              "content": "import java.util.ArrayList;\nimport java.util.Iterator;\n\npublic class IteratorBeispiel {\n    public static void main(String[] args) {\n        ArrayList<String> namen = new ArrayList<>();\n        namen.add(\"Ada\");\n        namen.add(\"Grace\");\n        namen.add(\"Linus\");\n\n        Iterator<String> iterator = namen.iterator();\n        while (iterator.hasNext()) {\n            System.out.println(\"Name: \" + iterator.next());\n        }\n    }\n}\n"
            },
            {
              "name": "LinkedListBeispiel.java",
              "path": "Grundlagen/Collections/LinkedListBeispiel.java",
              "type": "file",
              "content": "import java.util.LinkedList;\n\npublic class LinkedListBeispiel {\n    public static void main(String[] args) {\n        LinkedList<String> aufgaben = new LinkedList<>();\n        aufgaben.add(\"Planen\");\n        aufgaben.addFirst(\"Analysieren\");\n        aufgaben.addLast(\"Testen\");\n\n        System.out.println(\"Erste Aufgabe: \" + aufgaben.getFirst());\n        System.out.println(\"Letzte Aufgabe: \" + aufgaben.getLast());\n    }\n}\n"
            },
            {
              "name": "MehrdimensionaleArrays.java",
              "path": "Grundlagen/Collections/MehrdimensionaleArrays.java",
              "type": "file",
              "content": "public class MehrdimensionaleArrays {\n    public static void main(String[] args) {\n        int[][] matrix = {{1, 2}, {3, 4}, {5, 6}};\n\n        for (int[] zeile : matrix) {\n            for (int wert : zeile) {\n                System.out.println(\"Matrixwert: \" + wert);\n            }\n        }\n    }\n}\n"
            },
            {
              "name": "QueueUndDeque.java",
              "path": "Grundlagen/Collections/QueueUndDeque.java",
              "type": "file",
              "content": "import java.util.ArrayDeque;\nimport java.util.Deque;\n\npublic class QueueUndDeque {\n    public static void main(String[] args) {\n        Deque<String> warteschlange = new ArrayDeque<>();\n        warteschlange.offerLast(\"Ticket A\");\n        warteschlange.offerLast(\"Ticket B\");\n        warteschlange.offerFirst(\"Dringendes Ticket\");\n\n        System.out.println(\"Bearbeitet: \" + warteschlange.pollFirst());\n        System.out.println(\"Als Nächstes: \" + warteschlange.peekFirst());\n    }\n}\n"
            },
            {
              "name": "Sortieren.java",
              "path": "Grundlagen/Collections/Sortieren.java",
              "type": "file",
              "content": "import java.util.ArrayList;\nimport java.util.Collections;\n\npublic class Sortieren {\n    public static void main(String[] args) {\n        ArrayList<Integer> zahlen = new ArrayList<>();\n        zahlen.add(8);\n        zahlen.add(3);\n        zahlen.add(12);\n\n        Collections.sort(zahlen);\n        for (int zahl : zahlen) {\n            System.out.println(\"Sortiert: \" + zahl);\n        }\n    }\n}\n"
            }
          ]
        },
        {
          "name": "Eingaben",
          "path": "Grundlagen/Eingaben",
          "type": "directory",
          "children": [
            {
              "name": "ScannerEingabe.java",
              "path": "Grundlagen/Eingaben/ScannerEingabe.java",
              "type": "file",
              "content": "import java.util.Scanner;\n\npublic class ScannerEingabe {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(\"Ada\\n21\");\n\n        String name = scanner.nextLine();\n        int alter = scanner.nextInt();\n\n        System.out.println(\"Name: \" + name);\n        System.out.println(\"Alter: \" + alter);\n        scanner.close();\n    }\n}\n"
            }
          ]
        },
        {
          "name": "Entscheidungsblöcke",
          "path": "Grundlagen/Entscheidungsblöcke",
          "type": "directory",
          "children": [
            {
              "name": "TemperaturCheck.java",
              "path": "Grundlagen/Entscheidungsblöcke/TemperaturCheck.java",
              "type": "file",
              "content": "public class TemperaturCheck {\n    public static void main(String[] args) {\n        int temperatur = 18;\n\n        if (temperatur >= 25) {\n            System.out.println(\"Es ist warm.\");\n        } else if (temperatur >= 15) {\n            System.out.println(\"Es ist mild.\");\n        } else {\n            System.out.println(\"Es ist kalt.\");\n        }\n    }\n}\n"
            },
            {
              "name": "Wochentag.java",
              "path": "Grundlagen/Entscheidungsblöcke/Wochentag.java",
              "type": "file",
              "content": "public class Wochentag {\n    public static void main(String[] args) {\n        int tag = 3;\n\n        switch (tag) {\n            case 1 -> System.out.println(\"Montag\");\n            case 2 -> System.out.println(\"Dienstag\");\n            case 3 -> System.out.println(\"Mittwoch\");\n            case 4 -> System.out.println(\"Donnerstag\");\n            case 5 -> System.out.println(\"Freitag\");\n            default -> System.out.println(\"Wochenende\");\n        }\n    }\n}\n"
            }
          ]
        },
        {
          "name": "Exceptionhandling",
          "path": "Grundlagen/Exceptionhandling",
          "type": "directory",
          "children": [
            {
              "name": "EigeneException.java",
              "path": "Grundlagen/Exceptionhandling/EigeneException.java",
              "type": "file",
              "content": "public class EigeneException {\n    static class UngueltigesAlterException extends Exception {\n        public UngueltigesAlterException(String nachricht) {\n            super(nachricht);\n        }\n    }\n\n    public static void pruefeAlter(int alter) throws UngueltigesAlterException {\n        if (alter < 18) {\n            throw new UngueltigesAlterException(\"Das Mindestalter ist 18.\");\n        }\n    }\n\n    public static void main(String[] args) {\n        try {\n            pruefeAlter(16);\n        } catch (UngueltigesAlterException exception) {\n            System.out.println(\"Fehler: \" + exception.getMessage());\n        }\n    }\n}\n"
            },
            {
              "name": "MehrereCatchBloecke.java",
              "path": "Grundlagen/Exceptionhandling/MehrereCatchBloecke.java",
              "type": "file",
              "content": "public class MehrereCatchBloecke {\n    public static void demonstrieren() {\n        String eingabe = \"abc\";\n\n        try {\n            int zahl = Integer.parseInt(eingabe);\n            System.out.println(\"Zahl: \" + zahl);\n        } catch (NumberFormatException exception) {\n            System.out.println(\"Die Zahl hat ein ungültiges Format.\");\n        } catch (RuntimeException exception) {\n            System.out.println(\"Ein anderer Laufzeitfehler ist aufgetreten.\");\n        }\n    }\n}\n"
            },
            {
              "name": "MultiCatch.java",
              "path": "Grundlagen/Exceptionhandling/MultiCatch.java",
              "type": "file",
              "content": "import java.io.IOException;\n\npublic class MultiCatch {\n    public static void main(String[] args) {\n        try {\n            if (args.length == 0) {\n                throw new IOException(\"Keine Eingabedatei angegeben.\");\n            }\n            Integer.parseInt(args[0]);\n        } catch (IOException | NumberFormatException exception) {\n            System.out.println(\"Eingabe konnte nicht verarbeitet werden.\");\n        }\n    }\n}\n"
            },
            {
              "name": "ThrowsWeiterreichen.java",
              "path": "Grundlagen/Exceptionhandling/ThrowsWeiterreichen.java",
              "type": "file",
              "content": "public class ThrowsWeiterreichen {\n    public static void ladeDaten() throws Exception {\n        throw new Exception(\"Die Beispieldatei fehlt.\");\n    }\n\n    public static void main(String[] args) {\n        try {\n            ladeDaten();\n        } catch (Exception exception) {\n            System.out.println(\"Abgefangener Fehler: \" + exception.getMessage());\n        }\n    }\n}\n"
            },
            {
              "name": "TryCatch.java",
              "path": "Grundlagen/Exceptionhandling/TryCatch.java",
              "type": "file",
              "content": "public class TryCatch {\n    public static void main(String[] args) {\n        try {\n            int zahl = Integer.parseInt(\"kein Integer\");\n            System.out.println(\"Zahl: \" + zahl);\n        } catch (NumberFormatException exception) {\n            System.out.println(\"Die Eingabe ist keine Ganzzahl.\");\n        }\n    }\n}\n"
            },
            {
              "name": "TryCatchFinally.java",
              "path": "Grundlagen/Exceptionhandling/TryCatchFinally.java",
              "type": "file",
              "content": "public class TryCatchFinally {\n    public static void main(String[] args) {\n        String text = null;\n\n        try {\n            System.out.println(\"Länge: \" + text.length());\n        } catch (NullPointerException exception) {\n            System.out.println(\"Auf null kann keine Methode ausgeführt werden.\");\n        } finally {\n            System.out.println(\"Dieser Block wird immer ausgeführt.\");\n        }\n    }\n}\n"
            },
            {
              "name": "TryWithResources.java",
              "path": "Grundlagen/Exceptionhandling/TryWithResources.java",
              "type": "file",
              "content": "public class TryWithResources {\n    static class DemoRessource implements AutoCloseable {\n        public void verwenden() {\n            System.out.println(\"Ressource wird verwendet.\");\n        }\n\n        @Override\n        public void close() {\n            System.out.println(\"Ressource wird automatisch geschlossen.\");\n        }\n    }\n\n    public static void demonstrieren() {\n        try (DemoRessource ressource = new DemoRessource()) {\n            ressource.verwenden();\n        }\n    }\n}\n"
            }
          ]
        },
        {
          "name": "Grundliegendes",
          "path": "Grundlagen/Grundliegendes",
          "type": "directory",
          "children": [
            {
              "name": "BuildInMethoden.java",
              "path": "Grundlagen/Grundliegendes/BuildInMethoden.java",
              "type": "file",
              "content": "public class BuildInMethoden {\n    public static void main(String[] args) {\n        String text = \"Java lernen\";\n\n        int laenge = text.length();\n        String gross = text.toUpperCase();\n        boolean enthaeltJava = text.contains(\"Java\");\n\n        System.out.println(\"Länge: \" + laenge);\n        System.out.println(\"Großschrift: \" + gross);\n        System.out.println(\"Enthält Java: \" + enthaeltJava);\n    }\n}\n"
            },
            {
              "name": "Datentypen.java",
              "path": "Grundlagen/Grundliegendes/Datentypen.java",
              "type": "file",
              "content": "public class Datentypen {\n    public static void main(String[] args) {\n        int anzahl = 12;\n        double preis = 2.49;\n        boolean verfuegbar = true;\n        char kategorie = 'A';\n        String artikel = \"Apfel\";\n\n        System.out.println(artikel + \": \" + anzahl + \" Stück\");\n        System.out.println(\"Preis: \" + preis + \" Euro\");\n        System.out.println(\"Kategorie: \" + kategorie);\n        System.out.println(\"Verfügbar: \" + verfuegbar);\n    }\n}\n"
            },
            {
              "name": "DatumUndZeit.java",
              "path": "Grundlagen/Grundliegendes/DatumUndZeit.java",
              "type": "file",
              "content": "import java.time.LocalDate;\nimport java.time.format.DateTimeFormatter;\n\npublic class DatumUndZeit {\n    public static void main(String[] args) {\n        LocalDate datum = LocalDate.of(2026, 8, 27);\n        DateTimeFormatter format = DateTimeFormatter.ofPattern(\"dd.MM.yyyy\");\n\n        System.out.println(\"Datum: \" + datum.format(format));\n        System.out.println(\"Morgen: \" + datum.plusDays(1).format(format));\n    }\n}\n"
            },
            {
              "name": "EnumBeispiel.java",
              "path": "Grundlagen/Grundliegendes/EnumBeispiel.java",
              "type": "file",
              "content": "public class EnumBeispiel {\n    enum Ampel { ROT, GELB, GRUEN }\n\n    public static void main(String[] args) {\n        Ampel status = Ampel.GRUEN;\n\n        switch (status) {\n            case ROT -> System.out.println(\"Warten\");\n            case GELB -> System.out.println(\"Bereit machen\");\n            case GRUEN -> System.out.println(\"Fahren\");\n        }\n    }\n}\n"
            },
            {
              "name": "StringBuilderBeispiel.java",
              "path": "Grundlagen/Grundliegendes/StringBuilderBeispiel.java",
              "type": "file",
              "content": "public class StringBuilderBeispiel {\n    public static void main(String[] args) {\n        StringBuilder text = new StringBuilder();\n        text.append(\"Java\");\n        text.append(\" macht \");\n        text.append(\"Strukturen sichtbar.\");\n\n        System.out.println(text.toString());\n    }\n}\n"
            }
          ]
        },
        {
          "name": "Importe",
          "path": "Grundlagen/Importe",
          "type": "directory",
          "children": [
            {
              "name": "MathImport.java",
              "path": "Grundlagen/Importe/MathImport.java",
              "type": "file",
              "content": "import java.lang.Math;\n\npublic class MathImport {\n    public static void main(String[] args) {\n        double radius = 4.0;\n        double flaeche = Math.PI * Math.pow(radius, 2);\n\n        System.out.println(\"Kreisfläche: \" + flaeche);\n    }\n}\n"
            },
            {
              "name": "RandomImport.java",
              "path": "Grundlagen/Importe/RandomImport.java",
              "type": "file",
              "content": "import java.util.Random;\n\npublic class RandomImport {\n    public static void main(String[] args) {\n        Random zufall = new Random(42);\n        int zahl = zufall.nextInt(10) + 1;\n\n        System.out.println(\"Zufallszahl: \" + zahl);\n    }\n}\n"
            }
          ]
        },
        {
          "name": "Kontrollfluss",
          "path": "Grundlagen/Kontrollfluss",
          "type": "directory",
          "children": [
            {
              "name": "BreakContinue.java",
              "path": "Grundlagen/Kontrollfluss/BreakContinue.java",
              "type": "file",
              "content": "public class BreakContinue {\n    public static void main(String[] args) {\n        for (int zahl = 1; zahl <= 8; zahl++) {\n            if (zahl == 3) {\n                continue;\n            }\n            if (zahl == 6) {\n                break;\n            }\n            System.out.println(\"Zahl: \" + zahl);\n        }\n    }\n}\n"
            },
            {
              "name": "TernaererOperator.java",
              "path": "Grundlagen/Kontrollfluss/TernaererOperator.java",
              "type": "file",
              "content": "public class TernaererOperator {\n    public static void main(String[] args) {\n        int punkte = 72;\n        String ergebnis = punkte >= 50 ? \"bestanden\" : \"nicht bestanden\";\n\n        System.out.println(\"Prüfung: \" + ergebnis);\n    }\n}\n"
            }
          ]
        },
        {
          "name": "Methoden",
          "path": "Grundlagen/Methoden",
          "type": "directory",
          "children": [
            {
              "name": "Argumente.java",
              "path": "Grundlagen/Methoden/Argumente.java",
              "type": "file",
              "content": "public class Argumente {\n    public static void vorstellen(String name, int alter) {\n        System.out.println(name + \" ist \" + alter + \" Jahre alt.\");\n    }\n\n    public static void main(String[] args) {\n        vorstellen(\"Lin\", 24);\n        vorstellen(\"Sam\", 31);\n    }\n}\n"
            },
            {
              "name": "Rekursion.java",
              "path": "Grundlagen/Methoden/Rekursion.java",
              "type": "file",
              "content": "public class Rekursion {\n    public static int fakultaet(int zahl) {\n        if (zahl <= 1) {\n            return 1;\n        }\n        return zahl * fakultaet(zahl - 1);\n    }\n\n    public static void main(String[] args) {\n        System.out.println(\"5! = \" + fakultaet(5));\n    }\n}\n"
            },
            {
              "name": "ReturnMethode.java",
              "path": "Grundlagen/Methoden/ReturnMethode.java",
              "type": "file",
              "content": "public class ReturnMethode {\n    public static int quadrat(int zahl) {\n        return zahl * zahl;\n    }\n\n    public static void main(String[] args) {\n        int ergebnis = quadrat(6);\n        System.out.println(\"Quadrat: \" + ergebnis);\n    }\n}\n"
            },
            {
              "name": "VoidMethode.java",
              "path": "Grundlagen/Methoden/VoidMethode.java",
              "type": "file",
              "content": "public class VoidMethode {\n    public static void begruesse(String name) {\n        System.out.println(\"Hallo, \" + name + \"!\");\n    }\n\n    public static void main(String[] args) {\n        begruesse(\"Ada\");\n    }\n}\n"
            }
          ]
        },
        {
          "name": "Operatoren",
          "path": "Grundlagen/Operatoren",
          "type": "directory",
          "children": [
            {
              "name": "Rechenoperatoren.java",
              "path": "Grundlagen/Operatoren/Rechenoperatoren.java",
              "type": "file",
              "content": "public class Rechenoperatoren {\n    public static void main(String[] args) {\n        int a = 10;\n        int b = 3;\n\n        System.out.println(\"Addition: \" + (a + b));\n        System.out.println(\"Subtraktion: \" + (a - b));\n        System.out.println(\"Multiplikation: \" + (a * b));\n        System.out.println(\"Division: \" + (a / b));\n        System.out.println(\"Rest: \" + (a % b));\n    }\n}\n"
            },
            {
              "name": "VergleichsOperatoren.java",
              "path": "Grundlagen/Operatoren/VergleichsOperatoren.java",
              "type": "file",
              "content": "public class VergleichsOperatoren {\n    public static void main(String[] args) {\n        int alter = 20;\n        int mindestalter = 18;\n\n        boolean gleich = alter == mindestalter;\n        boolean ungleich = alter != mindestalter;\n        boolean volljaehrig = alter >= mindestalter;\n\n        System.out.println(\"Gleich: \" + gleich);\n        System.out.println(\"Ungleich: \" + ungleich);\n        System.out.println(\"Volljährig: \" + volljaehrig);\n    }\n}\n"
            },
            {
              "name": "Zuweisungsoperatoren.java",
              "path": "Grundlagen/Operatoren/Zuweisungsoperatoren.java",
              "type": "file",
              "content": "public class Zuweisungsoperatoren {\n    public static void main(String[] args) {\n        int punkte = 10;\n\n        punkte += 5;\n        System.out.println(\"Nach += 5: \" + punkte);\n\n        punkte -= 3;\n        System.out.println(\"Nach -= 3: \" + punkte);\n\n        punkte *= 2;\n        System.out.println(\"Nach *= 2: \" + punkte);\n    }\n}\n"
            }
          ]
        },
        {
          "name": "Schleifen",
          "path": "Grundlagen/Schleifen",
          "type": "directory",
          "children": [
            {
              "name": "EnhancedForLoop.java",
              "path": "Grundlagen/Schleifen/EnhancedForLoop.java",
              "type": "file",
              "content": "public class EnhancedForLoop {\n    public static void main(String[] args) {\n        String[] programmiersprachen = {\"Java\", \"Python\", \"JavaScript\"};\n\n        for (String sprache : programmiersprachen) {\n            System.out.println(\"Sprache: \" + sprache);\n        }\n    }\n}\n"
            },
            {
              "name": "ForSchleife.java",
              "path": "Grundlagen/Schleifen/ForSchleife.java",
              "type": "file",
              "content": "public class ForSchleife {\n    public static void main(String[] args) {\n        for (int zahl = 1; zahl <= 5; zahl++) {\n            System.out.println(\"Durchlauf: \" + zahl);\n        }\n\n        System.out.println(\"Die Schleife ist beendet.\");\n    }\n}\n"
            },
            {
              "name": "WhileSchleife.java",
              "path": "Grundlagen/Schleifen/WhileSchleife.java",
              "type": "file",
              "content": "public class WhileSchleife {\n    public static void main(String[] args) {\n        int countdown = 3;\n\n        while (countdown > 0) {\n            System.out.println(countdown);\n            countdown--;\n        }\n\n        System.out.println(\"Start!\");\n    }\n}\n"
            }
          ]
        },
        {
          "name": "Typen",
          "path": "Grundlagen/Typen",
          "type": "directory",
          "children": [
            {
              "name": "Typumwandlung.java",
              "path": "Grundlagen/Typen/Typumwandlung.java",
              "type": "file",
              "content": "public class Typumwandlung {\n    public static void main(String[] args) {\n        int ganzeZahl = 7;\n        double automatisch = ganzeZahl;\n\n        double kommazahl = 9.8;\n        int abgeschnitten = (int) kommazahl;\n\n        System.out.println(\"Automatische Umwandlung gelungen: \" + (automatisch == 7.0));\n        System.out.println(\"Explizit: \" + abgeschnitten);\n    }\n}\n"
            },
            {
              "name": "VariablenScope.java",
              "path": "Grundlagen/Typen/VariablenScope.java",
              "type": "file",
              "content": "public class VariablenScope {\n    public static void main(String[] args) {\n        int aussen = 10;\n\n        if (aussen > 5) {\n            int innen = 20;\n            System.out.println(\"Innen: \" + innen);\n            System.out.println(\"Außen erreichbar: \" + aussen);\n        }\n\n        System.out.println(\"Außen: \" + aussen);\n    }\n}\n"
            },
            {
              "name": "Wrapperklassen.java",
              "path": "Grundlagen/Typen/Wrapperklassen.java",
              "type": "file",
              "content": "public class Wrapperklassen {\n    public static void main(String[] args) {\n        Integer objektZahl = Integer.valueOf(\"42\");\n        int primitiveZahl = objektZahl;\n\n        System.out.println(\"Integer-Objekt: \" + objektZahl);\n        System.out.println(\"Autoboxing-Ergebnis: \" + (primitiveZahl * 2));\n    }\n}\n"
            }
          ]
        }
      ]
    },
    {
      "name": "ModerneJavaKonzepte",
      "path": "ModerneJavaKonzepte",
      "type": "directory",
      "children": [
        {
          "name": "GenericsBeispiel.java",
          "path": "ModerneJavaKonzepte/GenericsBeispiel.java",
          "type": "file",
          "content": "public class GenericsBeispiel {\n    static class Box<T> {\n        private final T wert;\n\n        public Box(T wert) {\n            this.wert = wert;\n        }\n\n        public T getWert() {\n            return this.wert;\n        }\n    }\n\n    public static void main(String[] args) {\n        Box<String> textBox = new Box<>(\"Typsicher\");\n        Box<Integer> zahlenBox = new Box<>(42);\n\n        System.out.println(textBox.getWert());\n        System.out.println(zahlenBox.getWert());\n    }\n}\n"
        },
        {
          "name": "LambdaBeispiel.java",
          "path": "ModerneJavaKonzepte/LambdaBeispiel.java",
          "type": "file",
          "content": "import java.util.function.Function;\n\npublic class LambdaBeispiel {\n    public static void main(String[] args) {\n        Function<Integer, Integer> verdoppeln = zahl -> zahl * 2;\n        Function<String, String> begruessen = name -> \"Hallo, \" + name;\n\n        System.out.println(\"Verdoppelt: \" + verdoppeln.apply(6));\n        System.out.println(begruessen.apply(\"Ada\"));\n    }\n}\n"
        },
        {
          "name": "OptionalBeispiel.java",
          "path": "ModerneJavaKonzepte/OptionalBeispiel.java",
          "type": "file",
          "content": "import java.util.Optional;\n\npublic class OptionalBeispiel {\n    public static void main(String[] args) {\n        Optional<String> name = Optional.of(\"Grace\");\n        String ausgabe = name.orElse(\"Unbekannt\");\n\n        System.out.println(\"Name: \" + ausgabe);\n    }\n}\n"
        },
        {
          "name": "RecordBeispiel.java",
          "path": "ModerneJavaKonzepte/RecordBeispiel.java",
          "type": "file",
          "content": "public class RecordBeispiel {\n    record Punkt(int x, int y) {}\n\n    public static void main(String[] args) {\n        Punkt punkt = new Punkt(4, 7);\n        System.out.println(\"Punkt: \" + punkt.x() + \", \" + punkt.y());\n    }\n}\n"
        },
        {
          "name": "StreamBeispiel.java",
          "path": "ModerneJavaKonzepte/StreamBeispiel.java",
          "type": "file",
          "content": "import java.util.List;\n\npublic class StreamBeispiel {\n    public static void main(String[] args) {\n        List<Integer> zahlen = List.of(1, 2, 3, 4, 5, 6);\n\n        List<Integer> geradeQuadrate = zahlen.stream().filter(zahl -> zahl % 2 == 0).map(zahl -> zahl * zahl).toList();\n\n        for (int zahl : geradeQuadrate) {\n            System.out.println(\"Quadrat: \" + zahl);\n        }\n    }\n}\n"
        },
        {
          "name": "UnveraenderlichesObjekt.java",
          "path": "ModerneJavaKonzepte/UnveraenderlichesObjekt.java",
          "type": "file",
          "content": "public class UnveraenderlichesObjekt {\n    static final class Benutzer {\n        private final String name;\n\n        public Benutzer(String name) {\n            this.name = name;\n        }\n\n        public String getName() {\n            return this.name;\n        }\n    }\n\n    public static void main(String[] args) {\n        Benutzer benutzer = new Benutzer(\"Ada\");\n        System.out.println(\"Unveränderlich: \" + benutzer.getName());\n    }\n}\n"
        }
      ]
    },
    {
      "name": "OOP",
      "path": "OOP",
      "type": "directory",
      "children": [
        {
          "name": "AbstrakteKlassen.java",
          "path": "OOP/AbstrakteKlassen.java",
          "type": "file",
          "content": "public class AbstrakteKlassen {\n    static abstract class Form {\n        public abstract double berechneFlaeche();\n\n        public void beschreiben() {\n            System.out.println(\"Ich bin eine geometrische Form.\");\n        }\n    }\n\n    static class Kreis extends Form {\n        private final double radius;\n\n        public Kreis(double radius) {\n            super();\n            this.radius = radius;\n        }\n\n        @Override\n        public double berechneFlaeche() {\n            return Math.PI * this.radius * this.radius;\n        }\n    }\n\n    public static void main(String[] args) {\n        Form form = new Kreis(3.0);\n        form.beschreiben();\n        System.out.println(\"Fläche: \" + form.berechneFlaeche());\n    }\n}\n"
        },
        {
          "name": "InterfaceBeispiel.java",
          "path": "OOP/InterfaceBeispiel.java",
          "type": "file",
          "content": "public class InterfaceBeispiel {\n    interface Druckbar {\n        void drucken();\n    }\n\n    static class Rechnung implements Druckbar {\n        @Override\n        public void drucken() {\n            System.out.println(\"Rechnung wird gedruckt.\");\n        }\n    }\n}\n"
        },
        {
          "name": "Kapselung.java",
          "path": "OOP/Kapselung.java",
          "type": "file",
          "content": "public class Kapselung {\n    static class Bankkonto {\n        private double saldo;\n\n        public void einzahlen(double betrag) {\n            if (betrag > 0) {\n                this.saldo += betrag;\n            }\n        }\n\n        public double getSaldo() {\n            return this.saldo;\n        }\n    }\n\n    public static void main(String[] args) {\n        Bankkonto konto = new Bankkonto();\n        konto.einzahlen(75.50);\n        System.out.println(\"Kontostand: \" + konto.getSaldo() + \" Euro\");\n    }\n}\n"
        },
        {
          "name": "Komposition.java",
          "path": "OOP/Komposition.java",
          "type": "file",
          "content": "public class Komposition {\n    static class Motor {\n        public void starten() {\n            System.out.println(\"Motor gestartet.\");\n        }\n    }\n\n    static class Auto {\n        private final Motor motor = new Motor();\n\n        public void starten() {\n            this.motor.starten();\n            System.out.println(\"Auto ist fahrbereit.\");\n        }\n    }\n\n    public static void main(String[] args) {\n        Auto auto = new Auto();\n        auto.starten();\n    }\n}\n"
        },
        {
          "name": "Konstruktoren.java",
          "path": "OOP/Konstruktoren.java",
          "type": "file",
          "content": "public class Konstruktoren {\n    static class Buch {\n        private final String titel;\n        private final int seiten;\n\n        public Buch(String titel, int seiten) {\n            this.titel = titel;\n            this.seiten = seiten;\n        }\n\n        public void anzeigen() {\n            System.out.println(this.titel + \" hat \" + this.seiten + \" Seiten.\");\n        }\n    }\n\n    public static void main(String[] args) {\n        Buch buch = new Buch(\"Java kompakt\", 320);\n        buch.anzeigen();\n    }\n}\n"
        },
        {
          "name": "MethodenÜberladung.java",
          "path": "OOP/MethodenÜberladung.java",
          "type": "file",
          "content": "public class MethodenÜberladung {\n    public static int addiere(int a, int b) {\n        return a + b;\n    }\n\n    public static double addiere(double a, double b) {\n        return a + b;\n    }\n\n    public static void main(String[] args) {\n        System.out.println(\"Ganzzahlen: \" + addiere(4, 7));\n        System.out.println(\"Kommazahlen: \" + addiere(2.5, 1.8));\n    }\n}\n"
        },
        {
          "name": "MethodenÜberschreibung.java",
          "path": "OOP/MethodenÜberschreibung.java",
          "type": "file",
          "content": "public class MethodenÜberschreibung {\n    static class Tier {\n        public void lautGeben() {\n            System.out.println(\"Das Tier macht ein Geräusch.\");\n        }\n    }\n\n    static class Hund extends Tier {\n        @Override\n        public void lautGeben() {\n            System.out.println(\"Der Hund bellt.\");\n        }\n    }\n\n    public static void main(String[] args) {\n        Tier tier = new Hund();\n        tier.lautGeben();\n    }\n}\n"
        },
        {
          "name": "ObjectMethoden.java",
          "path": "OOP/ObjectMethoden.java",
          "type": "file",
          "content": "import java.util.Objects;\n\npublic class ObjectMethoden {\n    static class Produkt {\n        private final int id;\n        private final String name;\n\n        public Produkt(int id, String name) {\n            this.id = id;\n            this.name = name;\n        }\n\n        @Override\n        public String toString() {\n            return this.id + \": \" + this.name;\n        }\n\n        @Override\n        public boolean equals(Object objekt) {\n            if (!(objekt instanceof Produkt)) {\n                return false;\n            }\n            Produkt anderesProdukt = (Produkt) objekt;\n            return this.id == anderesProdukt.id;\n        }\n\n        @Override\n        public int hashCode() {\n            return Objects.hash(this.id);\n        }\n    }\n\n    public static void main(String[] args) {\n        Produkt produkt = new Produkt(7, \"Tastatur\");\n        System.out.println(produkt.toString());\n    }\n}\n"
        },
        {
          "name": "ObjekteUndReferenzen.java",
          "path": "OOP/ObjekteUndReferenzen.java",
          "type": "file",
          "content": "public class ObjekteUndReferenzen {\n    static class Person {\n        String name;\n\n        public Person(String name) {\n            this.name = name;\n        }\n    }\n\n    public static void main(String[] args) {\n        Person ersteReferenz = new Person(\"Ada\");\n        Person zweiteReferenz = ersteReferenz;\n        zweiteReferenz.name = \"Grace\";\n\n        System.out.println(\"Erste Referenz sieht: \" + ersteReferenz.name);\n    }\n}\n"
        },
        {
          "name": "Polymorphie.java",
          "path": "OOP/Polymorphie.java",
          "type": "file",
          "content": "public class Polymorphie {\n    static class Tier {\n        public void lautGeben() {\n            System.out.println(\"Unbekanntes Tiergeräusch\");\n        }\n    }\n\n    static class Katze extends Tier {\n        @Override\n        public void lautGeben() {\n            System.out.println(\"Miau\");\n        }\n    }\n\n    static class Hund extends Tier {\n        @Override\n        public void lautGeben() {\n            System.out.println(\"Wuff\");\n        }\n    }\n\n    public static void main(String[] args) {\n        Tier erstesTier = new Katze();\n        Tier zweitesTier = new Hund();\n        erstesTier.lautGeben();\n        zweitesTier.lautGeben();\n    }\n}\n"
        },
        {
          "name": "ThisUndStatic.java",
          "path": "OOP/ThisUndStatic.java",
          "type": "file",
          "content": "public class ThisUndStatic {\n    private static int anzahlObjekte = 0;\n    private final String name;\n\n    public ThisUndStatic(String name) {\n        this.name = name;\n        anzahlObjekte++;\n    }\n\n    public String getName() {\n        return this.name;\n    }\n\n    public static int getAnzahlObjekte() {\n        return anzahlObjekte;\n    }\n}\n"
        },
        {
          "name": "Vererbung.java",
          "path": "OOP/Vererbung.java",
          "type": "file",
          "content": "public class Vererbung {\n    static class Fahrzeug {\n        public void fahren() {\n            System.out.println(\"Das Fahrzeug fährt.\");\n        }\n    }\n\n    static class Auto extends Fahrzeug {\n        public void hupen() {\n            System.out.println(\"Das Auto hupt.\");\n        }\n    }\n\n    public static void main(String[] args) {\n        Auto auto = new Auto();\n        auto.fahren();\n        auto.hupen();\n    }\n}\n"
        }
      ]
    },
    {
      "name": "QualitaetUndArchitektur",
      "path": "QualitaetUndArchitektur",
      "type": "directory",
      "children": [
        {
          "name": "AssertionsBeispiel.java",
          "path": "QualitaetUndArchitektur/AssertionsBeispiel.java",
          "type": "file",
          "content": "public class AssertionsBeispiel {\n    public static int addiere(int a, int b) {\n        return a + b;\n    }\n\n    public static void main(String[] args) {\n        int erwartet = 7;\n        int tatsaechlich = addiere(3, 4);\n\n        if (erwartet != tatsaechlich) {\n            throw new AssertionError(\"Erwartet: \" + erwartet + \", tatsächlich: \" + tatsaechlich);\n        }\n        System.out.println(\"Test erfolgreich.\");\n    }\n}\n"
        },
        {
          "name": "MvcBeispiel.java",
          "path": "QualitaetUndArchitektur/MvcBeispiel.java",
          "type": "file",
          "content": "public class MvcBeispiel {\n    static class Modell {\n        private String nachricht = \"Hallo MVC\";\n\n        public String getNachricht() {\n            return this.nachricht;\n        }\n    }\n\n    static class Ansicht {\n        public void anzeigen(String text) {\n            System.out.println(\"Ansicht: \" + text);\n        }\n    }\n\n    static class Controller {\n        private final Modell modell;\n        private final Ansicht ansicht;\n\n        public Controller(Modell modell, Ansicht ansicht) {\n            this.modell = modell;\n            this.ansicht = ansicht;\n        }\n\n        public void aktualisieren() {\n            this.ansicht.anzeigen(this.modell.getNachricht());\n        }\n    }\n\n    public static void main(String[] args) {\n        Controller controller = new Controller(new Modell(), new Ansicht());\n        controller.aktualisieren();\n    }\n}\n"
        },
        {
          "name": "SolidBeispiel.java",
          "path": "QualitaetUndArchitektur/SolidBeispiel.java",
          "type": "file",
          "content": "public class SolidBeispiel {\n    interface NachrichtenSender {\n        void senden(String nachricht);\n    }\n\n    static class BenachrichtigungsService {\n        private final NachrichtenSender sender;\n\n        public BenachrichtigungsService(NachrichtenSender sender) {\n            this.sender = sender;\n        }\n\n        public void benachrichtigen(String nachricht) {\n            this.sender.senden(nachricht);\n        }\n    }\n}\n"
        },
        {
          "name": "StrategieMuster.java",
          "path": "QualitaetUndArchitektur/StrategieMuster.java",
          "type": "file",
          "content": "public class StrategieMuster {\n    interface RabattStrategie {\n        double berechne(double preis);\n    }\n\n    static class StandardRabatt implements RabattStrategie {\n        public double berechne(double preis) {\n            return preis * 0.9;\n        }\n    }\n\n    static class Warenkorb {\n        private final RabattStrategie strategie;\n\n        public Warenkorb(RabattStrategie strategie) {\n            this.strategie = strategie;\n        }\n\n        public double endpreis(double preis) {\n            return this.strategie.berechne(preis);\n        }\n    }\n\n    public static void main(String[] args) {\n        Warenkorb warenkorb = new Warenkorb(new StandardRabatt());\n        double endpreis = warenkorb.endpreis(100.0);\n        System.out.println(\"Rabatt korrekt angewendet: \" + (endpreis == 90.0));\n    }\n}\n"
        }
      ]
    }
  ]
};
