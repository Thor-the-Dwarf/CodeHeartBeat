public class StringBuilderBeispiel {
    public static void main(String[] args) {
        StringBuilder text = new StringBuilder();
        text.append("Java");
        text.append(" macht ");
        text.append("Strukturen sichtbar.");

        System.out.println(text.toString());
    }
}
