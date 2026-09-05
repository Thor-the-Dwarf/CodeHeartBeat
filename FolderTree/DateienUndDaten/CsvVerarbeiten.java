public class CsvVerarbeiten {
    public static void main(String[] args) {
        String csv = "Name;Punkte\nAda;95\nLinus;88";
        String[] zeilen = csv.split("\\n");

        for (int index = 1; index < zeilen.length; index++) {
            String[] spalten = zeilen[index].split(";");
            System.out.println(spalten[0] + " hat " + spalten[1] + " Punkte.");
        }
    }
}
