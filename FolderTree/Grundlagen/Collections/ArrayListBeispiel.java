import java.util.ArrayList;

public class ArrayListBeispiel {
    public static void main(String[] args) {
        ArrayList<String> namen = new ArrayList<>();
        namen.add("Ada");
        namen.add("Linus");
        namen.add("Grace");

        System.out.println("Zweites Element: " + namen.get(1));
        System.out.println("Anzahl: " + namen.size());
    }
}
